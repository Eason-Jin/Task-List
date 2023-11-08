import React, { useState } from "react";
import "./TaskInput.css";

const TaskInput = ({ onAddTask, tasks, setTasks, message, setMessage }) => {
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [task, setTask] = useState("");

  let messageTimeout;

  const handleDayChange = (event) => {
    setDay(event.target.value);
  };

  const handleTimeChange = (event) => {
    setTime(event.target.value);
  };

  const handleTaskChange = (event) => {
    setTask(event.target.value);
  };

  const handleAddTaskClick = () => {
    if (task.trim() !== "") {
      onAddTask({
        day,
        time,
        task,
      });
      setTask("");
    } else {
      setMessage("Please enter a task!");

      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
      
      messageTimeout = setTimeout(() => {
        setMessage("");
      }, 2000);
    }
  };

  const handleClearTasks = () => {
    // Clear the completed list in state
    setTasks([
      {
        day: 'Monday',
        tasks: []
      },
      {
        day: 'Tuesday',
        tasks: []
      },
      {
        day: 'Wednesday',
        tasks: []
      },
      {
        day: 'Thursday',
        tasks: []
      },
      {
        day: 'Friday',
        tasks: []
      }
    ]);

    // Clear the completed list in local storage
    localStorage.removeItem("tasks");
  };

  return (
    <div className="task-input">
      <select value={day} onChange={handleDayChange}>
        <option value="">Select day</option>
        <option value="Monday">Monday</option>
        <option value="Tuesday">Tuesday</option>
        <option value="Wednesday">Wednesday</option>
        <option value="Thursday">Thursday</option>
        <option value="Friday">Friday</option>
      </select>
      <select value={time} onChange={handleTimeChange}>
        <option value="">Select time</option>
        <option value="9:00">9:00</option>
        <option value="10:00">10:00</option>
        <option value="11:00">11:00</option>
        <option value="12:00">12:00</option>
        <option value="13:00">13:00</option>
        <option value="14:00">14:00</option>
        <option value="15:00">15:00</option>
      </select>
      <input
        type="text"
        placeholder="Enter task"
        value={task}
        onChange={handleTaskChange}
      />
      <button onClick={handleAddTaskClick}>Add</button>
      <button onClick={handleClearTasks}>Clear All</button>
      <div className="msg">{message}</div>
    </div>
  );
};

export default TaskInput;
