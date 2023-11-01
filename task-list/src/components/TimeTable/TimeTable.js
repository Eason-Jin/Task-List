import React, { useState } from "react";
import "./TimeTable.css";
import TaskInput from "./TaskInput";

class Task {
  constructor(task, time, completed = false) {
    this.task = task;
    this.time = time;
    this.completed = completed;
  }
}

// Some hard coded value, remove afterwards
const TimeTable = () => {
  const [tasks, setTasks] = useState([
    {
      day: "Monday",
      tasks: [new Task("Task 1", "9:00"), new Task("Task 2", "10:00")],
    },
    {
      day: "Tuesday",
      tasks: [new Task("Task 3", "11:00"), new Task("Task 4", "12:00")],
    },
    {
      day: "Wednesday",
      tasks: [new Task("Task 5", "13:00"), new Task("Task 6", "14:00")],
    },
    {
      day: "Thursday",
      tasks: [new Task("Task 7", "15:00")],
    },
    {
      day: "Friday",
      tasks: [],
    },
  ]);


  const handleCheckboxChange = (task, day) => {
    const newTasks = tasks.map((taskDay) => {
      if (taskDay.day === day) {
        taskDay.tasks = taskDay.tasks.map((t) => {
          if (t === task) {
            t.completed = !t.completed;
          }
          return t;
        });
      }
      return taskDay;
    });
    setTasks(newTasks);
  };

  const handleAddTask = (task) => {
    const newTasks = tasks.map((taskDay) => {
      if (taskDay.day === task.day) {
        taskDay.tasks.push(new Task(task.task, task.time));
      }
      return taskDay;
    });
    setTasks(newTasks);
  };  

  const handleDeleteTask = (task, day) => {
    const newTasks = tasks.map((taskDay) => {
      if (taskDay.day === day) {
        // Filter returns a new array with the elements that meets the callback condition, so filter out the ones not equal to the task
        taskDay.tasks = taskDay.tasks.filter((t) => t !== task);
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
                    {taskDay.tasks
                      .filter((task) => task.time === `${index + 9}:00`)
                      .map((task) => (
                        <div key={task.task}>
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleCheckboxChange(task, taskDay.day)}
                          />
                          {task.task}
                          <button onClick={() => handleDeleteTask(task, taskDay.day)}>X</button>
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
