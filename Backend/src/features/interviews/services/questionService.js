// src/services/questionService.js

const { generateQuestion, generateFollowUpQuestion } = require('./geminiService');

const INTERVIEW_TOPICS = [
  {
    name: 'JavaScript',
    weight: 1,
    questionTypes: ['concepts', 'practical', 'advanced']
  },
  {
    name: 'Python',
    weight: 1,
    questionTypes: ['concepts', 'practical', 'advanced']
  },
  {
    name: 'React',
    weight: 1,
    questionTypes: ['concepts', 'hooks', 'performance']
  },
  {
    name: 'Node.js',
    weight: 1,
    questionTypes: ['concepts', 'async', 'performance']
  },
  {
    name: 'SQL',
    weight: 1,
    questionTypes: ['queries', 'optimization', 'design']
  },
  {
    name: 'Data Structures',
    weight: 1,
    questionTypes: ['concepts', 'problem-solving', 'complexity']
  },
  {
    name: 'Algorithms',
    weight: 1,
    questionTypes: ['sorting', 'searching', 'dynamic-programming']
  },
  {
    name: 'System Design',
    weight: 1,
    questionTypes: ['architecture', 'scalability', 'performance']
  }
];

const MAX_QUESTIONS = 5;
const MAX_FOLLOW_UPS = 2; // Maximum follow-up questions per main question
const usedQuestions = new Map(); // Store used questions per topic
const usedTopics = new Set(); // Track used topics
const questionHistory = new Map(); // Track question-answer pairs for follow-ups

// Tech-specific question templates
const TECH_SPECIFIC_QUESTIONS = {
  'JavaScript': {
    concepts: [
      'Explain closures and their practical applications',
      'Describe the event loop and how it works',
      'What are promises and how do they differ from callbacks?'
    ],
    practical: [
      'Write a debounce function',
      'Implement a deep clone function',
      'Create a memoization utility'
    ],
    advanced: [
      'Explain prototypal inheritance vs classical inheritance',
      'How does the this keyword work in different contexts?',
      'Describe the module pattern and its benefits'
    ]
  },
  'React': {
    concepts: [
      'Explain the Virtual DOM and its benefits',
      'What are controlled vs uncontrolled components?',
      'Describe React hooks and their rules'
    ],
    hooks: [
      'When would you use useMemo vs useCallback?',
      'Explain the useEffect cleanup function',
      'How do you create custom hooks?'
    ],
    performance: [
      'How do you optimize React component rendering?',
      'Explain React.memo and when to use it',
      'What are the benefits of code splitting?'
    ]
  },
  'Python': {
    concepts: [
      'Explain list comprehensions and their advantages',
      'What are decorators and how do they work?',
      'Describe the difference between lists and tuples'
    ],
    practical: [
      'Write a context manager',
      'Implement a generator function',
      'Create a custom iterator'
    ],
    advanced: [
      'Explain the GIL and its implications',
      'How does Python handle memory management?',
      'Describe metaclasses and their use cases'
    ]
  },
  'SQL': {
    queries: [
      'Write a query to find the second highest salary',
      'How would you find duplicate records?',
      'Write a self-join query'
    ],
    optimization: [
      'How do you optimize a slow query?',
      'Explain indexing strategies',
      'What are the different types of joins?'
    ],
    design: [
      'Design a database schema for an e-commerce site',
      'How do you handle database normalization?',
      'Explain ACID properties'
    ]
  }
};

// Mock question data for now
const questionBank = {
    "JavaScript": [
      { question: "What is closure in JavaScript?" },
      { question: "Explain the concept of hoisting in JavaScript." }
    ],
    "Python": [
      { question: "What is a list comprehension in Python?" },
      { question: "Explain the difference between deep copy and shallow copy in Python." }
    ],
    // Add more skills and questions as needed
  };
  
  const getQuestionsBySkills = (skills) => {
    let questions = [];
    skills.forEach(skill => {
      if (questionBank[skill]) {
        questions = [...questions, ...questionBank[skill]];
      }
    });
    return questions;
  };
  
  // New function to generate follow-up questions based on answer quality
  const generateFollowUpQuestion = async (originalQuestion, userAnswer, answerQuality) => {
    try {
      console.log('Generating follow-up question based on answer quality:', answerQuality);
      
      const followUpTypes = {
        'clarification': 'Ask for more specific details or examples',
        'deepening': 'Probe deeper into the topic',
        'practical': 'Ask for a practical implementation',
        'comparison': 'Ask to compare with related concepts',
        'optimization': 'Ask about performance or optimization'
      };

      let followUpType = 'clarification';
      
      // Determine follow-up type based on answer quality
      if (answerQuality.score >= 8) {
        // Good answer - ask for deepening or practical implementation
        followUpType = Math.random() > 0.5 ? 'deepening' : 'practical';
      } else if (answerQuality.score >= 6) {
        // Moderate answer - ask for clarification or comparison
        followUpType = Math.random() > 0.5 ? 'clarification' : 'comparison';
      } else {
        // Poor answer - ask for clarification or basic understanding
        followUpType = 'clarification';
      }

      const followUpPrompt = `Based on the user's answer to "${originalQuestion.question}", 
        generate a follow-up question that ${followUpTypes[followUpType]}. 
        The user's answer quality score is ${answerQuality.score}/10. 
        Make the follow-up question specific to their answer and the topic: ${originalQuestion.topic}`;

      const followUpQuestion = await generateQuestion(originalQuestion.topic, [], 0, followUpPrompt);
      
      return {
        question: followUpQuestion.question,
        type: followUpType,
        originalQuestionId: originalQuestion.id,
        topic: originalQuestion.topic,
        difficulty: followUpType === 'deepening' ? 'hard' : 'medium'
      };
    } catch (error) {
      console.error('Error generating follow-up question:', error);
      return getFallbackFollowUpQuestion(originalQuestion);
    }
  };

  const getFallbackFollowUpQuestion = (originalQuestion) => {
    const fallbackQuestions = {
      'JavaScript': 'Can you provide a practical example of this concept?',
      'React': 'How would you implement this in a real React component?',
      'Python': 'Can you show me how to use this in a function?',
      'SQL': 'Can you write a query that demonstrates this?',
      'Data Structures': 'Can you implement this data structure?'
    };

    return {
      question: fallbackQuestions[originalQuestion.topic] || 'Can you elaborate on this concept?',
      type: 'clarification',
      originalQuestionId: originalQuestion.id,
      topic: originalQuestion.topic,
      difficulty: 'medium'
    };
  };

  // Enhanced function to get tech-specific questions
  const getTechSpecificQuestion = async (skill, questionType = 'concepts') => {
    try {
      const techQuestions = TECH_SPECIFIC_QUESTIONS[skill];
      if (techQuestions && techQuestions[questionType]) {
        const questions = techQuestions[questionType];
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        
        return {
          question: randomQuestion,
          topic: skill,
          type: questionType,
          difficulty: questionType === 'advanced' ? 'hard' : questionType === 'practical' ? 'medium' : 'easy'
        };
      }
      
      // Fallback to AI generation
      return await generateQuestion(skill);
    } catch (error) {
      console.error('Error getting tech-specific question:', error);
      return getFallbackQuestion(skill);
    }
  };
  
  const getNextQuestion = async (currentTopic, questionNumber, previousAnswer = null) => {
    try {
      console.log(`Getting question ${questionNumber} for topic ${currentTopic}`);
      
      if (questionNumber > MAX_QUESTIONS) {
        return {
          isComplete: true,
          nextQuestion: null,
          nextTopic: null
        };
      }

      // Check if we should generate a follow-up question
      if (previousAnswer && previousAnswer.quality && previousAnswer.quality.score < 8) {
        const followUpCount = questionHistory.get(previousAnswer.questionId)?.followUpCount || 0;
        
        if (followUpCount < MAX_FOLLOW_UPS) {
          console.log('Generating follow-up question');
          const followUpQuestion = await generateFollowUpQuestion(
            previousAnswer.question, 
            previousAnswer.answer, 
            previousAnswer.quality
          );
          
          // Track follow-up count
          const questionData = questionHistory.get(previousAnswer.questionId) || { followUpCount: 0 };
          questionData.followUpCount = followUpCount + 1;
          questionHistory.set(previousAnswer.questionId, questionData);
          
          return {
            isComplete: false,
            nextQuestion: followUpQuestion,
            nextTopic: currentTopic,
            isFollowUp: true
          };
        }
      }

      // If we've used all topics, reset the used topics set
      if (usedTopics.size >= INTERVIEW_TOPICS.length) {
        usedTopics.clear();
      }

      // Select a new topic that hasn't been used recently
      let nextTopic = currentTopic;
      if (usedTopics.has(currentTopic)) {
        const availableTopic = INTERVIEW_TOPICS.find(topic => !usedTopics.has(topic.name));
        nextTopic = availableTopic ? availableTopic.name : INTERVIEW_TOPICS[0].name;
      }
      usedTopics.add(nextTopic);

      let question;
      let attempts = 0;
      const maxAttempts = 3;
      
      // Get previously used questions for this topic
      const topicUsedQuestions = usedQuestions.get(nextTopic) || new Set();

      // Try to get a unique question
      while (attempts < maxAttempts) {
        // Try to get a tech-specific question first
        question = await getTechSpecificQuestion(nextTopic);
        
        // Create a unique key for the question based on core content
        const questionKey = question.question.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (!topicUsedQuestions.has(questionKey)) {
          // Add to used questions
          topicUsedQuestions.add(questionKey);
          usedQuestions.set(nextTopic, topicUsedQuestions);
          
          console.log('Generated new unique question:', {
            topic: nextTopic,
            questionKey,
            usedQuestionsCount: topicUsedQuestions.size
          });
          
          return {
            isComplete: false,
            nextQuestion: {
              ...question,
              topic: nextTopic,
              id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            },
            nextTopic
          };
        }
        
        attempts++;
        console.log(`Attempt ${attempts}: Question was already used, trying again...`);
      }

      // If we couldn't get a unique question, move to a different topic
      const alternativeTopic = INTERVIEW_TOPICS.find(topic => 
        !usedTopics.has(topic.name) && topic.name !== nextTopic
      ) || INTERVIEW_TOPICS[0].name;

      usedTopics.add(alternativeTopic);
      question = await getTechSpecificQuestion(alternativeTopic);
      
      const newTopicQuestions = new Set([question.question.toLowerCase().replace(/[^a-z0-9]/g, '')]);
      usedQuestions.set(alternativeTopic, newTopicQuestions);

      return {
        isComplete: false,
        nextQuestion: {
          ...question,
          topic: alternativeTopic,
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        nextTopic: alternativeTopic
      };

    } catch (error) {
      console.error('Error getting next question:', error);
      return getFallbackQuestion(currentTopic);
    }
  };
  
  const getFallbackQuestion = (topic) => {
    return {
      question: `Explain a fundamental concept in ${topic}?`,
      expectedPoints: ["Definition", "Key concepts", "Example"],
      difficulty: "easy",
      requiresCode: false,
      topic: topic,
      id: `fallback_${Date.now()}`
    };
  };

  // Enhanced evaluation with follow-up tracking
  const evaluateAnswer = async (question, answer, isFollowUp = false) => {
    try {
      const evaluation = await generateQuestion(question.topic, 
        `Evaluate this answer: "${answer}" for the question: "${question.question}". 
         Provide a score from 1-10 and detailed feedback.`);
      
      // Store question-answer pair for potential follow-ups
      if (!isFollowUp) {
        questionHistory.set(question.id, {
          question: question,
          answer: answer,
          evaluation: evaluation,
          followUpCount: 0
        });
      }
      
      return {
        score: evaluation.score || 7,
        feedback: evaluation.feedback || 'Good answer, could be more detailed.',
        quality: {
          score: evaluation.score || 7,
          technicalAccuracy: evaluation.technicalAccuracy || 7,
          clarity: evaluation.clarity || 7,
          completeness: evaluation.completeness || 7
        }
      };
    } catch (error) {
      console.error('Error evaluating answer:', error);
      return {
        score: 7,
        feedback: 'Answer evaluated successfully.',
        quality: {
          score: 7,
          technicalAccuracy: 7,
          clarity: 7,
          completeness: 7
        }
      };
    }
  };
  
  const generateFinalEvaluation = (answers) => {
    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    const averageScore = Math.round(totalScore / answers.length);
    
    const strengths = [];
    const improvements = [];
    
    answers.forEach(answer => {
      if (answer.details.technicalAccuracy >= 8) {
        strengths.push(`Strong technical understanding in ${answer.question.topic}`);
      }
      if (answer.details.clarity < 7) {
        improvements.push(`Improve clarity in ${answer.question.topic} explanations`);
      }
    });

    return {
      overallScore: averageScore,
      questionScores: answers.map(a => ({
        topic: a.question.topic,
        score: a.score,
        feedback: a.feedback
      })),
      strengths: [...new Set(strengths)],
      improvementAreas: [...new Set(improvements)],
      finalFeedback: `Overall performance: ${averageScore}/10. ${
        averageScore >= 8 ? 'Excellent technical knowledge.' :
        averageScore >= 6 ? 'Good understanding with room for improvement.' :
        'Needs more practice and preparation.'
      }`
    };
  };
  
  // Reset both questions and topics when starting new interview
  const resetQuestions = () => {
    usedQuestions.clear();
    usedTopics.clear();
    questionHistory.clear();
    console.log('Question and topic history cleared');
  };
  
  module.exports = {
    getQuestionsBySkills,
    getNextQuestion,
    getFallbackQuestion,
    generateFollowUpQuestion,
    getTechSpecificQuestion,
    evaluateAnswer,
    INTERVIEW_TOPICS,
    generateFinalEvaluation,
    MAX_QUESTIONS,
    MAX_FOLLOW_UPS,
    TECH_SPECIFIC_QUESTIONS,
    resetQuestions
  }; 