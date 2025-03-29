import React, { useState, useEffect } from "react";
import { Card, Form, Button } from "react-bootstrap";
import axios from "axios";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/CreateQuiz.css";

const CreateQuiz = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Check authentication status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: "", options: [{ text: "", isCorrect: false }] },
    ]);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const addOption = (qIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push({ text: "", isCorrect: false });
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, field, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex][field] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert("Please log in to create a quiz!");
      navigate("/login");
      return;
    }

    try {
      const user = auth.currentUser;
      await axios.post(`${process.env.REACT_APP_API_URL}/quizzes/create`, {
        title,
        description,
        questions,
        creatorId: user.uid,
      });
      toast.success("Quiz created successfully. Go to Dashboard to Take this Quiz.", {
        onClose: () => navigate("/dashboard"),
      });
    } catch (error) {
      console.error("Error creating quiz:", error);
      toast.error("Failed to create quiz. Please try again.");
    }
  };

  return (
    <div className="create-quiz-container">
      <Card className="create-quiz-card">
        <Card.Body>
          <Card.Title>Create New Quiz</Card.Title>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </Form.Group>

            {questions.map((question, qIndex) => (
              <Card key={qIndex} className="question-card">
                <Card.Body>
                  <Form.Group>
                    <Form.Label>Question {qIndex + 1}</Form.Label>
                    <Form.Control
                      value={question.questionText}
                      onChange={(e) =>
                        handleQuestionChange(qIndex, "questionText", e.target.value)
                      }
                      required
                    />
                  </Form.Group>
                  {question.options.map((option, oIndex) => (
                    <Form.Group key={oIndex} className="option-group">
                      <Form.Control
                        value={option.text}
                        onChange={(e) =>
                          handleOptionChange(qIndex, oIndex, "text", e.target.value)
                        }
                        placeholder={`Option ${oIndex + 1}`}
                        required
                      />
                      <Form.Check
                        type="checkbox"
                        label="Correct Answer"
                        checked={option.isCorrect}
                        onChange={(e) =>
                          handleOptionChange(qIndex, oIndex, "isCorrect", e.target.checked)
                        }
                      />
                    </Form.Group>
                  ))}
                  <Button
                    variant="secondary"
                    onClick={() => addOption(qIndex)}
                    className="add-option-btn"
                  >
                    Add Option
                  </Button>
                </Card.Body>
              </Card>
            ))}

            <Button
              variant="secondary"
              onClick={addQuestion}
              className="add-question-btn"
            >
              Add Question
            </Button>
            <Button variant="primary" type="submit" className="create-quiz-btn">
              Create Quiz
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CreateQuiz;