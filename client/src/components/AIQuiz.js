import React, { useState } from "react";
import { Card, Button, Row, Col, Spinner, Alert } from "react-bootstrap";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/RandomQ.css";
import { CheckCircle } from "react-feather";

const AIQuiz = () => {
  const [preGeneratedQuizzes, setPreGeneratedQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quiz states
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showReview, setShowReview] = useState(false);

  const navigate = useNavigate();
  const API_KEY = "AIzaSyDU6_xOuwYO942u9EviA5V8uORHG_x5s4g";

  const predefinedTopics = [
    { topic: "HTML", questionCount: 10, difficulty: "Hard" },
    { topic: "CSS", questionCount: 10, difficulty: "Hard" },
    { topic: "JavaScript", questionCount: 10, difficulty: "Hard" },
    { topic: "React", questionCount: 10, difficulty: "Medium" },
    { topic: "Git & Github", questionCount: 10, difficulty: "Medium" },
    { topic: "MERN Stack Development", questionCount: 20, difficulty: "Medium" },
    { topic: "Python Basics", questionCount: 20, difficulty: "Medium" },
    { topic: "C and C++", questionCount: 20, difficulty: "Medium" },
    { topic: "Backend Development", questionCount: 20, difficulty: "Hard" },
  ];

  const generateQuiz = async (topic, questionCount, difficulty) => {
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Generate a ${difficulty.toLowerCase()} difficulty quiz about ${topic} with ${questionCount} multiple-choice questions. 
      Provide the response in the following strict JSON format:
      {
        "title": "${topic} Quiz",
        "description": "A ${difficulty.toLowerCase()} difficulty quiz on ${topic} with ${questionCount} questions.",
        "questions": [
          {
            "questionText": "Question text",
            "options": [
              {"text": "Option 1", "isCorrect": false},
              {"text": "Option 2", "isCorrect": true},
              {"text": "Option 3", "isCorrect": false},
              {"text": "Option 4", "isCorrect": false}
            ]
          }
        ]
      }
      Ensure: Exactly ${questionCount} questions, 4 options per question, one correct answer per question. Wrap JSON in \`\`\`json ... \`\`\`.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonString = jsonMatch ? jsonMatch[1].trim() : response.slice(response.indexOf("{"), response.lastIndexOf("}") + 1).trim();

      const quizData = JSON.parse(jsonString);
      quizData.category = topic;
      quizData.difficulty = difficulty;
      quizData.timesTaken = 0;
      quizData.highestScore = 0;
      quizData.createdAt = new Date().toISOString();

      return quizData;
    } catch (err) {
      console.error(`Error generating quiz for ${topic}:`, err);
      return null;
    }
  };

  const fetchPreGeneratedQuizzes = async () => {
    setLoading(true);
    setError(null);
    const quizzes = await Promise.all(
      predefinedTopics.map(({ topic, questionCount, difficulty }) =>
        generateQuiz(topic, questionCount, difficulty)
      )
    );
    const validQuizzes = quizzes.filter((quiz) => quiz !== null);
    if (validQuizzes.length !== predefinedTopics.length) {
      setError("Some quizzes failed to load. Please try again.");
    }
    setPreGeneratedQuizzes(validQuizzes);
    setLoading(false);
  };

  const handleGenerateAIQuiz = () => {
    const user = auth.currentUser;
    if (user) {
      fetchPreGeneratedQuizzes(); // Fetch quizzes only when button is clicked
    } else {
      toast.error("Please log in or sign up first to generate an AI Quiz!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
      });
    }
  };

  const handleStartQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setQuizCompleted(false);
    setUserAnswers([]);
    setShowReview(false);
  };

  const handleAnswerSelect = (selectedOption) => {
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];
    setSelectedAnswer(selectedOption);

    const answerData = {
      questionText: currentQuestion.questionText,
      selectedAnswer: selectedOption,
      correctAnswer: currentQuestion.options.find((opt) => opt.isCorrect),
    };

    const existingAnswerIndex = userAnswers.findIndex(
      (ans) => ans.questionText === currentQuestion.questionText
    );

    if (existingAnswerIndex !== -1) {
      const updatedAnswers = [...userAnswers];
      updatedAnswers[existingAnswerIndex] = answerData;
      setUserAnswers(updatedAnswers);
    } else {
      setUserAnswers((prev) => [...prev, answerData]);
    }
  };

  const handleNextQuestion = () => {
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];

    if (selectedAnswer && selectedAnswer.isCorrect) {
      setScore((prevScore) => prevScore + 1);
    }

    if (currentQuestionIndex + 1 < currentQuiz.questions.length) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      setSelectedAnswer(null);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      const user = auth.currentUser;
      const quizToSave = {
        ...currentQuiz,
        creatorId: user ? user.uid : "anonymous",
        timesTaken: 1,
        highestScore: Math.round((score / currentQuiz.questions.length) * 100),
      };

      await axios.post(`${process.env.REACT_APP_API_URL}/quizzes/create`, quizToSave);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving quiz:", error);
      alert("Failed to save quiz. Please try again.");
    }
  };

  const handleRestartQuiz = () => {
    handleStartQuiz(currentQuiz);
  };

  const handleReviewAnswers = () => {
    setShowReview(true);
  };

  const renderQuizQuestion = () => {
    if (!currentQuiz) return null;
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];

    return (
      <Card className="quiz-question-card">
        <Card.Body>
          <Card.Title>Question {currentQuestionIndex + 1}</Card.Title>
          <Card.Text>{currentQuestion.questionText}</Card.Text>
          <div className="answer-options">
            {currentQuestion.options.map((option, index) => (
              <Button
                key={index}
                variant={
                  selectedAnswer === option
                    ? option.isCorrect
                      ? "success"
                      : "danger"
                    : "outline-secondary"
                }
                className="w-100 mb-2"
                onClick={() => handleAnswerSelect(option)}
                disabled={selectedAnswer !== null}
              >
                {option.text}
              </Button>
            ))}
          </div>
          {selectedAnswer && (
            <Button
              variant="primary"
              className="mt-3 w-100"
              onClick={handleNextQuestion}
            >
              {currentQuestionIndex + 1 === currentQuiz.questions.length
                ? "Finish Quiz"
                : "Next Question"}
            </Button>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderQuizResult = () => {
    if (!quizCompleted) return null;
    const percentage = (score / currentQuiz.questions.length) * 100;

    return (
      <Card className="quiz-result-card">
        <Card.Body className="text-center">
          <Card.Title>Quiz Completed!</Card.Title>
          <Card.Text>
            <h3>Your Score: {score} / {currentQuiz.questions.length}</h3>
            <h4>{percentage >= 70 ? "Great Job!" : "Keep Practicing!"}</h4>
            <p>Percentage: {percentage.toFixed(2)}%</p>
          </Card.Text>
          <div className="d-flex justify-content-center gap-2">
            <Button variant="primary" onClick={handleRestartQuiz}>
              Restart Quiz
            </Button>
            <Button variant="info" onClick={handleReviewAnswers}>
              Review Answers
            </Button>
            <Button variant="success" onClick={handleSubmitQuiz}>
              Save Quiz to Profile
            </Button>
            <Button variant="secondary" onClick={() => setCurrentQuiz(null)}>
              Back to Quizzes
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderAnswerReview = () => {
    if (!showReview) return null;

    return (
      <Card className="review-card">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Quiz Review</h4>
          <Button
            variant="light"
            size="sm"
            onClick={() => {
              setShowReview(false);
              setCurrentQuiz(null);
            }}
          >
            Close
          </Button>
        </Card.Header>
        <Card.Body>
          {userAnswers.map((answer, index) => (
            <div
              key={index}
              className={`mb-3 p-3 rounded ${
                answer.selectedAnswer.isCorrect
                  ? "bg-success bg-opacity-10"
                  : "bg-danger bg-opacity-10"
              }`}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Question {index + 1}</h5>
                {answer.selectedAnswer.isCorrect ? (
                  <CheckCircle color="green" />
                ) : (
                  <CheckCircle color="red" />
                )}
              </div>
              <p className="mb-2">{answer.questionText}</p>
              <div className="d-flex justify-content-between">
                <div className="w-50 me-2">
                  <strong className="text-muted">Your Answer:</strong>
                  <Button
                    variant={answer.selectedAnswer.isCorrect ? "success" : "danger"}
                    className="w-100 mt-1"
                  >
                    {answer.selectedAnswer.text}
                  </Button>
                </div>
                <div className="w-50">
                  <strong className="text-muted">Correct Answer:</strong>
                  <Button variant="success" className="w-100 mt-1">
                    {answer.correctAnswer.text}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </Card.Body>
        <Card.Footer className="bg-light text-center">
          <h5>
            Score: {userAnswers.filter((ans) => ans.selectedAnswer.isCorrect).length} /{" "}
            {userAnswers.length}
          </h5>
        </Card.Footer>
      </Card>
    );
  };

  return (
    <div className="randomq-container">
      <h1 className="randomq-title">AI Generated Quizzes</h1>
      {!preGeneratedQuizzes.length && !loading && !currentQuiz && (
        <div className="text-center mb-4">
          <Button
            variant="primary"
            className="generate-ai-quiz-btn"
            onClick={handleGenerateAIQuiz}
          >
            Generate AI Quiz
          </Button>
        </div>
      )}
      {loading && (
        <div className="text-center mt-5">
          <Spinner animation="border" />
          <p>Loading quizzes...</p>
        </div>
      )}
      {error && (
        <Alert variant="danger" className="text-center mt-3">
          {error}
        </Alert>
      )}
      {!currentQuiz && !loading && preGeneratedQuizzes.length > 0 && (
        <Row>
          {preGeneratedQuizzes.map((quiz, index) => (
            <Col md={4} key={index} className="mb-4">
              <Card className="quiz-card">
                <Card.Body>
                  <Card.Title>{quiz.title}</Card.Title>
                  <Card.Text>
                    {quiz.description}
                    <br />
                    <strong>Questions:</strong> {quiz.questions.length}
                    <br />
                    <strong>Difficulty:</strong> {quiz.difficulty}
                  </Card.Text>
                  <Button variant="success" onClick={() => handleStartQuiz(quiz)}>
                    Start Quiz
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
      {currentQuiz && !quizCompleted && (
        <Row>
          <Col md={8} className="mx-auto">
            {renderQuizQuestion()}
          </Col>
        </Row>
      )}
      {quizCompleted && (
        <Row>
          <Col md={8} className="mx-auto">
            {renderQuizResult()}
          </Col>
        </Row>
      )}
      {showReview && (
        <Row>
          <Col md={10} className="mx-auto">
            {renderAnswerReview()}
          </Col>
        </Row>
      )}
    </div>
  );
};

export default AIQuiz;