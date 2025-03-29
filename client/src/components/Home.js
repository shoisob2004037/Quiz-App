import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Form,
  Row,
  Col,
  Spinner,
  Alert,
} from "react-bootstrap";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle } from "react-feather";
import "../styles/Home.css";

const Home = () => {
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("Easy");
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Quiz states
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);

  const navigate = useNavigate();
  const API_KEY = "AIzaSyDU6_xOuwYO942u9EviA5V8uORHG_x5s4g";

  // Check authentication status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleGenerateQuiz = async () => {
    if (!topic) {
      setError("Please enter a quiz topic");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedQuiz(null);

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Generate a ${difficulty.toLowerCase()} difficulty quiz about ${topic} with ${questionCount} multiple-choice questions. 
      Provide the response in the following strict JSON format:
      {
        "title": "Quiz Title",
        "description": "Quiz description",
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
      let jsonString = jsonMatch
        ? jsonMatch[1].trim()
        : response.slice(response.indexOf("{"), response.lastIndexOf("}") + 1).trim();

      const quizData = JSON.parse(jsonString);
      quizData.category = topic;
      quizData.difficulty = difficulty;
      quizData.timesTaken = 0;
      quizData.highestScore = 0;
      quizData.createdAt = new Date().toISOString();

      setGeneratedQuiz(quizData);
    } catch (err) {
      console.error("Error generating quiz:", err);
      setError(`Failed to generate quiz: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    setCurrentQuiz(generatedQuiz);
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
    handleStartQuiz();
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
            <h3>
              Your Score: {score} / {currentQuiz.questions.length}
            </h3>
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
            <Button
              variant="secondary"
              onClick={() => {
                setCurrentQuiz(null);
                setQuizCompleted(false);
                setGeneratedQuiz(null);
              }}
            >
              Generate New Quiz
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
              setGeneratedQuiz(null);
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
                  <XCircle color="red" />
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
            Score:{" "}
            {userAnswers.filter((ans) => ans.selectedAnswer.isCorrect).length} /{" "}
            {userAnswers.length}
          </h5>
        </Card.Footer>
      </Card>
    );
  };

  return (
    <div className="home-container">
      <section className="intro-section text-center mb-5">
        <h1 className="intro-title">Welcome to QuizMaster</h1>
        <p className="intro-text">
          Unleash your curiosity with QuizMaster—where you craft your own quizzes or dive into AI-generated challenges! 
          Whether you're sharpening your skills, gearing up for exams, or simply seeking fun, create custom quizzes, 
          explore diverse topics, track your journey, and save your triumphs to your profile.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="intro-button"
          onClick={() =>
            document.getElementById("quiz-form")?.scrollIntoView({ behavior: "smooth" }) ||
            navigate("/register")
          }
        >
          Get Started
        </Button>

        {/* Feature Cards */}
        <Row className="feature-cards mt-5 justify-content-center">
          <Col xs={12} sm={6} md={4} className="mb-4">
            <Card className="feature-card create-quiz-card">
              <Card.Body>
                <Card.Title>Create Your Own Quiz</Card.Title>
                <hr />
                <Card.Text>
                  Create custom quizzes with your own questions and options then Attend the Quizzes to see your performance.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} className="mb-4">
            <Card className="feature-card ai-quiz-card">
              <Card.Body>
                <Card.Title>Explore AI-Generated Quizzes</Card.Title>
                <hr />
                <Card.Text>
                  Explore Some AI Generated Quizzes with different Topics of Web Development (HTML,CSS,JavaScript,Git & Github, React.JS, MERN Stack).
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} className="mb-4">
            <Card className="feature-card search-quiz-card">
              <Card.Body>
                <Card.Title>Create Your own topics by AI</Card.Title>
                <hr />
                <Card.Text>
                  Create your Quiz by AI with your desired topics , difficulty and number of questions as you want then Save it to your profile to evaluate you.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} className="mb-4">
            <Card className="feature-card review-save-card">
              <Card.Body>
                <Card.Title>Review & Preserve</Card.Title>
                <hr />
                <Card.Text>
                  Reflect on your answers, save your progress, and revisit your brilliance whenever you please.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} className="mb-4">
            <Card className="feature-card dashboard-card">
              <Card.Body>
                <Card.Title>Track Your Dashboard</Card.Title>
                <hr />
                <Card.Text>
                  Monitor your performance and curate your quiz collection—all from your personalized command center.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Quiz Generator Form - Only for authenticated users */}
      {isAuthenticated && (
        <section id="quiz-form" className="generator-section">
          <Card className="generator-card">
            <Card.Header className="bg-primary text-black">
              AI Quiz Generator || Create by Searching any Topic
            </Card.Header>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Topic</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter quiz topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Number of Questions</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        max="50"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Difficulty</Form.Label>
                      <Form.Control
                        as="select"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                      >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                </Row>
                <div className="text-center mt-3">
                  <Button
                    variant="primary"
                    onClick={handleGenerateQuiz}
                    disabled={loading || !topic}
                  >
                    {loading ? "Generating..." : "Generate Quiz"}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </section>
      )}

      {loading && (
        <div className="text-center mt-5">
          <Spinner animation="border" />
          <p>Generating your quiz with Gemini...</p>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="text-center mt-3">
          {error}
        </Alert>
      )}

      {generatedQuiz && !currentQuiz && (
        <Row className="mt-5">
          <Col md={8} className="mx-auto">
            <Card className="generated-quiz-card">
              <Card.Body>
                <Card.Title>{generatedQuiz.title}</Card.Title>
                <Card.Text>
                  {generatedQuiz.description}
                  <br />
                  <strong>Questions:</strong> {generatedQuiz.questions.length}
                  <br />
                  <strong>Category:</strong> {generatedQuiz.category}
                  <br />
                  <strong>Difficulty:</strong> {generatedQuiz.difficulty}
                </Card.Text>
                <Button variant="success" onClick={handleStartQuiz}>
                  Start Quiz
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {currentQuiz && !quizCompleted && (
        <Row className="mt-5">
          <Col md={8} className="mx-auto">
            {renderQuizQuestion()}
          </Col>
        </Row>
      )}

      {quizCompleted && (
        <Row className="mt-5">
          <Col md={8} className="mx-auto">
            {renderQuizResult()}
          </Col>
        </Row>
      )}

      {showReview && (
        <Row className="mt-5">
          <Col md={10} className="mx-auto">
            {renderAnswerReview()}
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Home;