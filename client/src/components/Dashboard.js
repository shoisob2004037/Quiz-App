import React, { useEffect, useState } from "react";
import { Card, Button, Row, Col, Tabs, Tab, Spinner } from "react-bootstrap";
import axios from "axios";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { toast } from "react-toastify";
import "../styles/Dashboard.css";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [performance, setPerformance] = useState([]);
  const [createdCount, setCreatedCount] = useState(0);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const user = auth.currentUser;

    if (!user) {
      setError("Please log in to view dashboard");
      setLoading(false);
      return;
    }

    try {
      // Fetch performance data
      const perfResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/quizzes/performance/${user.uid}`
      );
      setPerformance(perfResponse.data.quizPerformance || []);
      setCreatedCount(perfResponse.data.createdQuizzesCount || 0);

      // Fetch all quizzes and filter by creatorId
      const quizResponse = await axios.get(`${process.env.REACT_APP_API_URL}/quizzes/`);
      const allQuizzes = quizResponse.data || [];
      const userQuizzes = allQuizzes.filter(quiz => quiz.creatorId === user.uid);
      setAvailableQuizzes(userQuizzes);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load quiz data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please log in to delete a quiz");
      return;
    }

    if (window.confirm("Are you sure you want to delete this quiz?")) {
      try {
        await axios.delete(
          `${process.env.REACT_APP_API_URL}/quizzes/delete/${quizId}`,
          {
            data: { userId: user.uid },
          }
        );
        toast.success("Quiz deleted successfully!", {
          onClose: () => fetchData(),
        });
      } catch (error) {
        console.error("Error deleting quiz:", error);
        setError(
          error.response?.data?.message || "Failed to delete quiz. Please try again."
        );
      }
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchData();
    });
    return () => unsubscribe();
  }, []);

  // Overall Attempts vs Scores Pie Chart
  const overallChartData = {
    labels: ["Attempts", "Average Score"],
    datasets: [
      {
        data: [
          performance.reduce((sum, quiz) => sum + quiz.attempts, 0),
          performance.reduce((sum, quiz) => sum + quiz.averagePercentage, 0) /
            (performance.length || 1),
        ],
        backgroundColor: ["#36A2EB", "#FF6384"],
        hoverBackgroundColor: ["#36A2EB", "#FF6384"],
      },
    ],
  };

  // Individual Quiz Performance Chart
  const getQuizChartData = (quiz) => ({
    labels: quiz.scores.map((_, idx) => `A${idx + 1}`),
    datasets: [
      {
        label: "Score (%)",
        data: quiz.scores.map((score) => score.percentage),
        fill: false,
        borderColor: "#4BC0C0",
        tension: 0.1,
        pointRadius: 3,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw}%`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 25,
          font: {
            size: 10,
          },
        },
      },
    },
  };

  // Calculate summary stats
  const totalAttempts = performance.reduce((sum, quiz) => sum + quiz.attempts, 0);
  const totalQuizzesTaken = performance.length;
  const averageScore =
    performance.reduce((sum, quiz) => sum + quiz.averagePercentage, 0) /
    (performance.length || 1);
  const highestScore = Math.max(
    ...performance.map((quiz) => quiz.highestScore),
    0
  );
  const totalAvailableQuizzes = availableQuizzes.length;

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-5 text-danger">
        <p>{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title mb-4">Dashboard</h2>

      <Card className="stats-card mb-4">
        <Card.Body>
          <Card.Title>Overall Performance Summary</Card.Title>
          <Row>
            <Col md={6} sm={12} className="mb-3 mb-md-0">
              <div className="summary-details">
                <p>
                  <strong>Total Quizzes Created:</strong>{" "}
                  <span style={{ color: "green" }}>{createdCount}</span>
                </p>
                <p>
                  <strong>Total Quizzes Taken:</strong>
                  <span style={{ color: "green" }}>{totalQuizzesTaken}</span>
                </p>
                <p>
                  <strong>Total Attempts:</strong>{" "}
                  <span style={{ color: "green" }}>{totalAttempts}</span>
                </p>
                <p>
                  <strong>Average Score:</strong>{" "}
                  <span style={{ color: "green" }}>
                    {averageScore.toFixed(2)}%
                  </span>
                </p>
                <p>
                  <strong>Highest Score:</strong>{" "}
                  <span style={{ color: "green" }}>{highestScore}%</span>
                </p>
                <p>
                  <strong>Available Quizzes:</strong>{" "}
                  <span style={{ color: "green" }}>{totalAvailableQuizzes}</span>
                </p>
              </div>
            </Col>
            <Col md={6} sm={12}>
              <div className="chart-container" style={{ height: "250px" }}>
                <Pie data={overallChartData} options={{ responsive: true }} />
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Tabs defaultActiveKey="performance" className="mb-4">
        <Tab eventKey="performance" title="My Performance">

          <h3>Your Quiz Performance</h3>
          {performance.length === 0 ? (
            <p>No quiz attempts yet</p>
          ) : (
            <Row>
              {performance.map((quiz, index) => (
                <Col md={4} key={index} className="mb-4">
                  <Card className="quiz-card performance">
                    <Card.Body>
                      <Card.Title>{quiz.title}</Card.Title>
                      <Card.Text>
                        Attempts: {quiz.attempts}
                        <br />
                        Highest Score: {quiz.highestScore}%
                        <br />
                        Average: {quiz.averagePercentage.toFixed(2)}%
                      </Card.Text>
                      {quiz.attempts > 0 ? (
                        <div style={{ height: "150px", marginBottom: "15px" }}>
                          <Line
                            data={getQuizChartData(quiz)}
                            options={chartOptions}
                          />
                        </div>
                      ) : (
                        <p className="text-muted">No attempts yet</p>
                      )}
                      <Button
                        variant="success"
                        className="btn-custom btn-custom-success"
                        onClick={() =>
                          navigate(
                            `/quiz/${
                              quiz.quizId ||
                              availableQuizzes.find((q) => q.title === quiz.title)?._id
                            }`
                          )
                        }
                      >
                        Attend Quiz
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Tab>

        <Tab eventKey="available" title="My Quizzes">
          <h4 style={{textAlign:'center',color:'black',fontWeight:'bold'}}>Attend a Quiz from Here to Evaluate and see your performance.</h4>
          <p style={{textAlign:'center',color:'black',fontStyle:'italic'}}>The Quiz which created/generated by you or save to profile shows here.</p>
          {availableQuizzes.length === 0 ? (
            <p>No quizzes available yet</p>
          ) : (
            <Row>
              {availableQuizzes.map((quiz) => (
                <Col md={4} key={quiz._id} className="mb-4">
                  <Card className="quiz-card available">
                    <Card.Body>
                      <Card.Title>{quiz.title}</Card.Title>
                      <Card.Text>
                        {quiz.description}
                        <br />
                        Questions: {quiz.questions.length}
                        <br />
                        Times Taken: {quiz.timesTaken}
                        <br />
                        Highest Score: {quiz.highestScore}%
                      </Card.Text>
                      <div className="d-flex gap-2">
                        <Button
                          variant="success"
                          className="btn-custom btn-custom-success"
                          onClick={() => navigate(`/quiz/${quiz._id}`)}
                        >
                          Attend Quiz
                        </Button>
                        {quiz.creatorId === auth.currentUser?.uid && (
                          <Button
                            variant="danger"
                            className="btn-custom"
                            onClick={() => handleDeleteQuiz(quiz._id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Tab>
      </Tabs>
    </div>
  );
};

export default Dashboard;