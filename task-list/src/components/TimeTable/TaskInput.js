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
    onAddTask({
      day,
      time,
      task,
    });
    setTask("");
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
        <option value="9:00 AM">9:00 AM</option>
        <option value="10:00 AM">10:00 AM</option>
        <option value="11:00 AM">11:00 AM</option>
        <option value="12:00 PM">12:00 PM</option>
        <option value="1:00 PM">1:00 PM</option>
        <option value="2:00 PM">2:00 PM</option>
        <option value="3:00 PM">3:00 PM</option>
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
