import React from "react";
import "./Completed.css";

const Completed = ({ completedTasks, setCompletedTasks }) => {
  const handleClearCompleted = () => {
    // Clear the completed list in state
    setCompletedTasks([]);

    // Clear the completed list in local storage
    localStorage.removeItem("completedTasks");
  };

  return (
    <div className="completed">
      <h1>Completed</h1>
      <button onClick={handleClearCompleted}>Clear Completed</button>
      <ul>
        {completedTasks.map((task, index) => (
          <li key={index}>{task.task}</li>
        ))}
      </ul>
    </div>
  );
};

export default Completed;
