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
      <h1>COMPLETED</h1>
      <button onClick={handleClearCompleted}>CLEAR</button>
      <ul>
        {completedTasks.map((task, index) => (
          <li key={index}><input type="checkbox" checked />{task.task}</li>
        ))}
      </ul>
    </div>
  );
};

export default Completed;
