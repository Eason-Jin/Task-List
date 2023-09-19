import React, { useState } from "react";
import "./TimeTable.css";

const TimeTable = () => {
  const [tasks, setTasks] = useState([
    {
      day: "Monday",
      tasks: [
        {
          id: 1,
          task: "Task 1",
          time: "9:00 AM",
          completed: false,
        },
        {
          id: 2,
          task: "Task 2",
          time: "9:00 AM",
          completed: false,
        },
      ],
    },
    {
      day: "Tuesday",
      tasks: [
        {
          id: 3,
          task: "Task 3",
          time: "10:00 AM",
          completed: false,
        },
        {
          id: 4,
          task: "Task 4",
          time: "10:00 AM",
          completed: false,
        },
      ],
    },
    {
      day: "Wednesday",
      tasks: [
        {
          id: 5,
          task: "Task 5",
          time: "11:00 AM",
          completed: false,
        },
        {
          id: 6,
          task: "Task 6",
          time: "11:00 AM",
          completed: false,
        },
      ],
    },
    {
      day: "Thursday",
      tasks: [
        {
          id: 7,
          task: "Task 7",
          time: "12:00 PM",
          completed: false,
        },
      ],
    },
    {
      day: "Friday",
      tasks: [],
    },
  ]);

  const handleCheckboxChange = (id, day) => {
    const newTasks = tasks.map((taskDay) => {
      if (taskDay.day === day) {
        taskDay.tasks = taskDay.tasks.map((task) => {
          if (task.id === id) {
            task.completed = !task.completed;
          }
          return task;
        });
      }
      return taskDay;
    });
    setTasks(newTasks);
  };

  return (
    <div className="time-table">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Monday</th>
            <th>Tuesday</th>
            <th>Wednesday</th>
            <th>Thursday</th>
            <th>Friday</th>
          </tr>
        </thead>
        <tbody>
          {Array(7)
            .fill(null)
            .map((_, index) => (
              <tr key={index}>
                <td>{index + 9}:00 AM</td>
                {tasks.map((taskDay) => (
                  <td key={taskDay.day}>
                    {taskDay.tasks.filter((task) => task.time === `${index + 9}:00 AM`).map((task) => (
                      <div key={task.id}>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleCheckboxChange(task.id, taskDay.day)}
                        />
                        {task.task}
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimeTable;
