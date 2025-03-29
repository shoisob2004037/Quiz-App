import Quiz from "../models/Quiz.js"
import User from "../models/User.js"
import Score from "../models/Score.js"

// Create a new quiz
export const createQuiz = async (req, res) => {
  try {
    const { title, description, questions, creatorId } = req.body

    const quiz = await Quiz.create({
      title,
      description,
      questions,
      creatorId,
    })

    // Add quiz to user's quizzesCreated array
    await User.findOneAndUpdate({ firebaseUID: creatorId }, { $push: { quizzesCreated: quiz._id } })

    res.status(201).json(quiz)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// Get all quizzes for a user
export const getUserQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creatorId: req.params.userId })
    res.json(quizzes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// Get a single quiz by ID
export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)

    if (quiz) {
      res.json(quiz)
    } else {
      res.status(404).json({ message: "Quiz not found" })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// Update a quiz
export const updateQuiz = async (req, res) => {
  try {
    const { title, description, questions } = req.body

    const quiz = await Quiz.findById(req.params.id)

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" })
    }

    // Check if user is the creator
    if (quiz.creatorId !== req.body.userId) {
      return res.status(401).json({ message: "User not authorized" })
    }

    quiz.title = title || quiz.title
    quiz.description = description || quiz.description
    quiz.questions = questions || quiz.questions

    const updatedQuiz = await quiz.save()
    res.json(updatedQuiz)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}
export const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Check if user is the creator
    if (quiz.creatorId !== req.body.userId) {
      return res.status(401).json({ message: "User not authorized" });
    }

    // Delete the quiz
    await Quiz.deleteOne({ _id: req.params.id });

    // Remove quiz from user's quizzesCreated array
    await User.findOneAndUpdate(
      { firebaseUID: req.body.userId },
      { $pull: { quizzesCreated: req.params.id } }
    );

    // Delete all scores associated with this quiz
    await Score.deleteMany({ quizId: req.params.id });

    res.json({ message: "Quiz removed" });
  } catch (error) {
    console.error("Error in deleteQuiz:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
// Submit a quiz and calculate score


// Get user scores for a specific quiz
export const getQuizScores = async (req, res) => {
  try {
    const scores = await Score.find({
      userId: req.params.userId,
      quizId: req.params.quizId,
    }).sort({ createdAt: -1 })

    res.json(scores)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}


export const getUserQuizPerformance = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get all scores for this user
    const scores = await Score.find({ userId })
      .populate('quizId', 'title')
      .sort({ createdAt: -1 });

    // Group scores by quiz, skipping invalid quizIds
    const quizPerformance = {};
    scores.forEach(score => {
      if (!score.quizId) {
        console.warn(`Score document ${score._id} has no valid quizId reference`);
        return; // Skip this score
      }

      const quizId = score.quizId._id.toString();
      if (!quizPerformance[quizId]) {
        quizPerformance[quizId] = {
          quizId: quizId, // Include quizId for navigation
          title: score.quizId.title || "Unknown Quiz",
          attempts: 0,
          scores: [],
          highestScore: 0,
          averagePercentage: 0
        };
      }
      
      quizPerformance[quizId].attempts++;
      quizPerformance[quizId].scores.push({
        score: score.score,
        percentage: score.percentage,
        date: score.createdAt
      });
      quizPerformance[quizId].highestScore = Math.max(
        quizPerformance[quizId].highestScore,
        score.percentage
      );
      quizPerformance[quizId].averagePercentage = 
        (quizPerformance[quizId].averagePercentage * (quizPerformance[quizId].attempts - 1) + score.percentage) / 
        quizPerformance[quizId].attempts;
    });

    // Get created quizzes count
    const createdQuizzes = await Quiz.countDocuments({ creatorId: userId });

    res.json({
      quizPerformance: Object.values(quizPerformance),
      createdQuizzesCount: createdQuizzes
    });
  } catch (error) {
    console.error("Error in getUserQuizPerformance:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const submitQuiz = async (req, res) => {
  try {
    const { userId, answers } = req.body;
    const quizId = req.params.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Calculate score and review data
    let correctAnswers = 0;
    const review = [];

    quiz.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const correctOptionIndex = question.options.findIndex((option) => option.isCorrect);
      const isCorrect = userAnswer === correctOptionIndex;

      if (isCorrect) {
        correctAnswers++;
      }

      review.push({
        questionText: question.questionText,
        userAnswer: userAnswer !== undefined ? question.options[userAnswer]?.text : "Not answered",
        correctAnswer: question.options[correctOptionIndex].text,
        isCorrect: isCorrect,
      });
    });

    const totalQuestions = quiz.questions.length;
    const percentage = (correctAnswers / totalQuestions) * 100;

    // Create score record
    const score = await Score.create({
      userId,
      quizId,
      score: correctAnswers,
      totalQuestions,
      percentage,
    });

    // Update quiz stats
    quiz.timesTaken += 1;
    quiz.highestScore = Math.max(quiz.highestScore, percentage);
    await quiz.save();

    res.json({
      score: correctAnswers,
      totalQuestions,
      percentage,
      scoreId: score._id,
      timesTaken: quiz.timesTaken,
      review: review, // Add review data to response
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .select('title description creatorId questions timesTaken highestScore createdAt')
      .populate('creatorId', 'name');
    res.json(quizzes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};