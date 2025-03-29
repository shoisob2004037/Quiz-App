import React, { useState, useEffect } from "react";
import { Card, Button, Form, Accordion, Badge } from "react-bootstrap";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import "../styles/Quiz.css"; 

const Quiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/quizzes/${id}`
        );
        setQuiz(response.data);
        setAnswers(new Array(response.data.questions.length).fill(null));
      } catch (error) {
        console.error("Error fetching quiz:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleAnswerChange = (questionIndex, optionIndex) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    try {
      const user = auth.currentUser;
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/quizzes/submit/${id}`,
        {
          userId: user.uid,
          answers,
        }
      );
      setResults(response.data);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    }
  };

  if (loading) {
    return <div className="text-center mt-5">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="text-center mt-5">Quiz not found</div>;
  }

  return (
    <div className="quiz-container">
      <Card className="quiz-card">
        <Card.Body>
          <Card.Title className="quiz-title">{quiz.title}</Card.Title>
          <Card.Text className="quiz-description">{quiz.description}</Card.Text>

          {!submitted ? (
            <Form>
              {quiz.questions.map((question, qIndex) => (
                <div key={qIndex} className="question-block">
                  <h5 className="question-text">
                    {qIndex + 1}. {question.questionText}
                  </h5>
                  {question.options.map((option, oIndex) => (
                    <Form.Check
                      key={oIndex}
                      type="radio"
                      label={option.text}
                      name={`question-${qIndex}`}
                      checked={answers[qIndex] === oIndex}
                      onChange={() => handleAnswerChange(qIndex, oIndex)}
                      className="quiz-option"
                    />
                  ))}
                </div>
              ))}
              <Button
                variant="primary"
                onClick={handleSubmit}
                className="submit-btn"
              >
                Submit Quiz
              </Button>
            </Form>
          ) : (
            <div>
              <h3 className="results-header">Results</h3>
              <p className="results-text">
                Score: {results.score} / {results.totalQuestions} (
                <span className="results-percentage">
                  {results.percentage.toFixed(2)}%
                </span>)
              </p>
              <Button
                variant="secondary"
                onClick={() => navigate("/dashboard")}
                className="back-btn"
              >
                Back to Dashboard
              </Button>

              <h4 className="review-header">Review Your Answers</h4>
              <Accordion>
                {results.review.map((item, index) => (
                  <Accordion.Item
                    eventKey={index.toString()}
                    key={index}
                    className={item.isCorrect ? "review-correct" : "review-incorrect"}
                  >
                    <Accordion.Header>
                      <div className="accordion-header-custom">
                        <span>{item.questionText}</span>
                        <Badge bg={item.isCorrect ? "success" : "danger"}>
                          {item.isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                      </div>
                    </Accordion.Header>
                    <Accordion.Body>
                      <p className="review-text">
                        <strong>Your Answer:</strong> {item.userAnswer}
                      </p>
                      <p className="review-text">
                        <strong>Correct Answer:</strong> {item.correctAnswer}
                      </p>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default Quiz;