import React, { useState } from "react";
import "./TimeTable.css";
import TaskInput from "./TaskInput";

const TimeTable = () => {
  const [tasks, setTasks] = useState([
    {
      day: "Monday",
      tasks: [
        {
          id: 1,
          task: "Task 1",
          time: "9:00",
          completed: false,
        },
        {
          id: 2,
          task: "Task 2",
          time: "10:00",
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
          time: "11:00",
          completed: false,
        },
        {
          id: 4,
          task: "Task 4",
          time: "12:00",
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
          time: "13:00",
          completed: false,
        },
        {
          id: 6,
          task: "Task 6",
          time: "14:00",
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
          time: "15:00",
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

  const handleAddTask = (task) => {
    const newTasks = tasks.map((taskDay) => {
      if (taskDay.day === task.day) {
        taskDay.tasks.push({
          id: Math.random(),
          task: task.task,
          time: task.time,
          completed: false,
        });
      }
      return taskDay;
    });
    setTasks(newTasks);
  };

  const handleDeleteTask = (id, day) => {
    const newTasks = tasks.map((taskDay) => {
      if (taskDay.day === day) {
        taskDay.tasks = taskDay.tasks.filter((task) => task.id !== id);
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
                <td>{index + 9}:00</td>
                {tasks.map((taskDay) => (
                  <td key={taskDay.day}>
                    {taskDay.tasks.filter((task) => task.time === `${index + 9}:00`).map((task) => (
                      <div key={task.id}>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleCheckboxChange(task.id, taskDay.day)}
                        />
                        {task.task}
                        <button onClick={() => handleDeleteTask(task.id, taskDay.day)}>X</button>
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>

      <TaskInput className="task-input" onAddTask={handleAddTask} />
    </div>
  );
};

export default TimeTable;
