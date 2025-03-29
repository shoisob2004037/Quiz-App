// src/components/QuizCard.js
"use client";
import { Link } from "react-router-dom";
import { formatDate } from "../utils/helpers";

const QuizCard = ({ quiz, onDelete }) => {
  return (
    <div className="quiz-card h-100">
      <div className="card-body">
        <h5 className="card-title">{quiz.title}</h5>
        <p className="card-text">{quiz.description}</p>
        <div className="card-text">
          <small className="text-muted">
            {quiz.questions.length} questions | Taken {quiz.timesTaken} times
          </small>
        </div>
        {quiz.highestScore > 0 && (
          <div className="card-text">
            <small className="text-muted">
              Highest Score: {quiz.highestScore.toFixed(0)}%
            </small>
          </div>
        )}
        <div className="card-text">
          <small className="text-muted">Created: {formatDate(quiz.createdAt)}</small>
        </div>
        <div className="card-actions mt-3 d-flex gap-2">
          <Link to={`/take-quiz/${quiz._id}`} className="btn btn-primary">
            Take Quiz
          </Link>
          <Link to={`/edit-quiz/${quiz._id}`} className="btn btn-outline-secondary">
            Edit
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(quiz._id)}
              className="btn btn-outline-danger"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizCard;