import React, { useEffect } from "react";

const Completed = ({ completedTasks, setCompletedTasks }) => {
  // Load tasks from local storage (you can keep this part if needed)
  useEffect(() => {
    const storedTasks = localStorage.getItem("completedTasks");
    if (storedTasks) {
      setCompletedTasks(JSON.parse(storedTasks));
    }
  });

  const handleClearCompleted = () => {
    // Clear the completed list in state
    setCompletedTasks([]);
    
    // Clear the completed list in local storage
    localStorage.removeItem("completedTasks");
  };

  return (
    <div>
      <h1>Completed</h1>
      <button onClick={handleClearCompleted}>Clear Completed</button>
      <ul>
        {completedTasks.map((task, index) => (
          <li key={index}>
            {task.task}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Completed;
