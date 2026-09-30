const PDFDocument = require('pdfkit');

/**
 * Builds the PDF for a given test's leaderboard and pipes it to the express response.
 */
function buildLeaderboardPdf(test, rankedAttempts, res) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });

      // Pipe to response
      doc.pipe(res);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('QuickHire AI - Test Leaderboard', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica').text(`Test: ${test.title}`, { align: 'center' });
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Table configuration
      const tableTop = doc.y;
      const colX = {
        rank: 40,
        name: 70,
        score: 220,
        time: 270,
        proctoring: 340,
        submitted: 460
      };
      
      const rowHeight = 25;
      
      // Draw Table Header
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Rank', colX.rank, tableTop);
      doc.text('Candidate Name', colX.name, tableTop);
      doc.text('Score', colX.score, tableTop);
      doc.text('Time', colX.time, tableTop);
      doc.text('Proctoring', colX.proctoring, tableTop);
      doc.text('Submitted', colX.submitted, tableTop);
      
      doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      doc.font('Helvetica').fontSize(9);
      
      let currY = tableTop + 25;
      const pageBottom = doc.page.height - 50;

      rankedAttempts.forEach((attempt) => {
        // Pagination logic
        if (currY + rowHeight > pageBottom) {
          doc.addPage();
          currY = 40;
          
          // Re-draw header on new page
          doc.font('Helvetica-Bold').fontSize(10);
          doc.text('Rank', colX.rank, currY);
          doc.text('Candidate Name', colX.name, currY);
          doc.text('Score', colX.score, currY);
          doc.text('Time', colX.time, currY);
          doc.text('Proctoring', colX.proctoring, currY);
          doc.text('Submitted', colX.submitted, currY);
          
          doc.moveTo(40, currY + 15).lineTo(550, currY + 15).stroke();
          
          doc.font('Helvetica').fontSize(9);
          currY += 25;
        }

        const mins = Math.floor(attempt.timeTaken / 60);
        const secs = attempt.timeTaken % 60;
        const timeStr = `${mins}m ${secs}s`;
        
        const dateStr = new Date(attempt.submittedAt).toLocaleString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const proctorStatus = attempt.suspicious ? `SUSPICIOUS (${attempt.suspicionScore}/100)` : (attempt.violationsCount === 0 ? 'CLEAN' : `FLAGGED (${attempt.violationsCount})`);

        doc.text(attempt.rank.toString(), colX.rank, currY);
        doc.text(attempt.candidateName, colX.name, currY, { width: 140, lineBreak: false });
        doc.text(attempt.score.toString(), colX.score, currY);
        doc.text(timeStr, colX.time, currY);
        
        if (attempt.suspicious) doc.fillColor('red');
        else if (attempt.violationsCount > 0) doc.fillColor('orange');
        else doc.fillColor('green');
        
        doc.text(proctorStatus, colX.proctoring, currY);
        doc.fillColor('black');
        
        doc.text(dateStr, colX.submitted, currY);

        doc.moveTo(40, currY + 15).lineTo(550, currY + 15).strokeColor('#eeeeee').stroke();
        doc.strokeColor('#000000'); // reset stroke

        currY += rowHeight;
      });

      doc.end();
      resolve();
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}

module.exports = {
  buildLeaderboardPdf
};
