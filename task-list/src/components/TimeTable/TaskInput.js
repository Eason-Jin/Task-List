import React, { useState } from "react";

const TaskInput = ({ onAddTask }) => {
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [task, setTask] = useState("");

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
    }
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
      <button onClick={handleAddTaskClick}>Add task</button>
    </div>
  );
};

export default TaskInput;
