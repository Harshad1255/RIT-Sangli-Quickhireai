const Interview = require('../models/Interview');
const Candidate = require('../../candidates/models/Candidate');
const xlsx = require('xlsx');
const { randomUUID } = require('node:crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Upload candidates from Excel
const uploadCandidates = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const workbook = require('xlsx').read(req.file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = require('xlsx').utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Excel file is empty'
      });
    }

    // Get the first row to detect column names
    const firstRow = data[0];
    const columnNames = Object.keys(firstRow);

    // Function to find column by possible names
    const findColumn = (possibleNames) => {
      return columnNames.find(col => 
        possibleNames.some(name => {
          const cleanCol = col.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanCol.includes(cleanName) || cleanName.includes(cleanCol);
        })
      );
    };

    // Find required columns with expanded possible matches
    const emailColumn = findColumn([
      'email', 'emailaddress', 'mail', 'email address', 'emailid', 'personalemail', 'collegeemail',
      'student email', 'candidate email', 'primary email'
    ]);
    const nameColumn = findColumn([
      'name', 'fullname', 'studentname', 'candidatename', 'student full name', 'studentfullname',
      'full name', 'candidate full name', 'complete name'
    ]);
    const phoneColumn = findColumn([
      'phone', 'mobile', 'contact', 'phonenumber', 'mobilenumber', 'contactnumber', 'phone number',
      'mobile number', 'contact number', 'student phone', 'candidate phone'
    ]);

    if (!emailColumn || !nameColumn || !phoneColumn) {
      return res.status(400).json({
        success: false,
        error: 'Required columns not found in the Excel file.',
        details: {
          missingColumns: {
            email: !emailColumn ? 'Email Address column not found' : null,
            name: !nameColumn ? 'Full Name column not found' : null,
            phone: !phoneColumn ? 'Phone Number column not found' : null
          },
          expectedColumns: [
            'Email Address or similar (e.g., Student Email, Email ID)',
            'Full Name or similar (e.g., Student Full Name, Candidate Name)',
            'Phone Number or similar (e.g., Mobile Number, Contact)'
          ],
          foundColumns: columnNames
        },
        message: 'Please ensure your Excel file has columns for Email Address, Full Name, and Phone Number. You can download a template for the correct format.'
      });
    }

    const interviewId = req.params.interviewId;
    const Interview = require('../models/Interview');
    const Candidate = require('../../candidates/models/Candidate');
    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const candidates = [];
    const codes = new Set();
    const errors = [];
    const processedEmails = new Set();

    for (const row of data) {
      // Clean and validate the data
      const email = (row[emailColumn]?.toString() || '').trim().toLowerCase();
      const name = (row[nameColumn]?.toString() || '').trim();
      const phone = (row[phoneColumn]?.toString() || '').trim().replace(/[^0-9+]/g, '');

      // Skip empty rows
      if (!email && !name && !phone) {
        continue;
      }

      // Validate required fields
      if (!email || !name || !phone) {
        errors.push(`Missing required fields for row: ${JSON.stringify(row)}`);
        continue;
      }

      // Skip duplicate emails
      if (processedEmails.has(email)) {
        errors.push(`Duplicate email found: ${email}`);
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Invalid email format: ${email}`);
        continue;
      }

      // Validate phone number (must be at least 10 digits)
      if (phone.replace(/[^0-9]/g, '').length < 10) {
        errors.push(`Invalid phone number for ${name}: ${phone}`);
        continue;
      }

      processedEmails.add(email);

      // Generate unique code for each candidate
      let code;
      do {
        code = randomUUID().substring(0, 8).toUpperCase();
      } while (codes.has(code));
      codes.add(code);

      try {
        // Create or update candidate
        let candidate = await Candidate.findOne({ email });
        if (!candidate) {
          candidate = new Candidate({
            name,
            email,
            mobile: phone
          });
        }

        // Add interview to candidate's interviews array
        candidate.interviews.push({
          interviewId,
          code,
          status: 'pending'
        });

        await candidate.save();

        // Add candidate to interview's candidates array
        interview.candidates.push({
          candidate: candidate._id,
          code,
          status: 'pending'
        });

        candidates.push({
          name,
          email,
          mobile: phone,
          code
        });
      } catch (error) {
        errors.push(`Error processing candidate ${email}: ${error.message}`);
      }
    }

    await interview.save();

    res.status(200).json({
      success: true,
      candidates,
      message: `Successfully processed ${candidates.length} candidates`,
      totalProcessed: candidates.length,
      totalErrors: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error uploading candidates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload candidates',
      details: error.message
    });
  }
};

// Update candidate status
const updateCandidateStatus = async (req, res) => {
  try {
    const { interviewId, candidateId } = req.params;
    const { status } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    const candidate = interview.candidates.find(c => c.candidate.toString() === candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    candidate.status = status;
    await interview.save();

    res.json({ success: true, message: 'Candidate status updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Validate interview code and start interview
const validateInterviewCode = async (req, res) => {
  try {
    const { interviewCode, candidateCode } = req.body;
    
    const interview = await Interview.findOne({ interviewCode: interviewCode });
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Invalid interview code' });
    }

    const candidate = interview.candidates.find(c => c.code === candidateCode);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Invalid candidate code' });
    }

    if (candidate.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Interview already completed' });
    }

    if (candidate.status === 'expired') {
      return res.status(400).json({ success: false, error: 'Interview code has expired' });
    }

    // Update candidate status
    candidate.status = 'in-progress';
    candidate.startedAt = new Date();
    await interview.save();

    // Generate interview token
    const { generateToken } = require('../../auth/middleware/auth');
    const token = generateToken({
      interviewId: interview._id,
      candidateId: candidate.candidate,
      type: 'candidate'
    });

    res.json({
      success: true,
      token,
      interview: {
        id: interview._id,
        title: interview.title,
        skills: interview.skills,
        duration: interview.duration
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  uploadCandidates,
  updateCandidateStatus,
  validateInterviewCode
}; 