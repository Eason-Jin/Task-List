import React, { useEffect } from "react";

const Completed = ({ completedTasks, setCompletedTasks }) => {
  // Load tasks from local storage (you can keep this part if needed)
  useEffect(() => {
    const storedTasks = localStorage.getItem("completedTasks");
    if (storedTasks) {
      setCompletedTasks(JSON.parse(storedTasks));
    }
  });

  return (
    <div>
      <h1>Completed</h1>
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
