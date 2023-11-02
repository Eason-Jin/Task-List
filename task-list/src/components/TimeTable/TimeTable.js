import React, { useState, useEffect } from "react";
import "./TimeTable.css";
import TaskInput from "./TaskInput";
import Completed from "./Completed";

class Task {
  constructor(task, time, completed = false) {
    this.task = task;
    this.time = time;
    this.completed = completed;
  }
}

// Save tasks to local storage
const saveToLocalStorage = (updatedTasks) => {
  localStorage.setItem("tasks", JSON.stringify(updatedTasks));
};



const TimeTable = () => {
  const [completedTasks, setCompletedTasks] = useState([]);
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


  // Load tasks from local storage
  useEffect(() => {
    const storedTasks = localStorage.getItem("tasks");
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  }, []);

  // Load completed tasks from local storage
  useEffect(() => {
    const storedTasks = localStorage.getItem("completedTasks");
    if (storedTasks) {
      setCompletedTasks(JSON.parse(storedTasks));
    }
  }, []);

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

    // Save the updated tasks to localStorage
    saveToLocalStorage(newTasks);
  };

  const handleAddTask = (task) => {
    const newTasks = tasks.map((taskDay) => {
      if (taskDay.day === task.day) {
        taskDay.tasks.push(new Task(task.task, task.time));
      }
      return taskDay;
    });
    setTasks(newTasks);

    // Save the updated tasks to localStorage
    saveToLocalStorage(newTasks);
  };

  const handleDeleteTask = (task, day) => {
    const newTasks = tasks.map((taskDay) => {
      if (taskDay.day === day) {
        // If the task is completed, add it to the completed tasks array
        if (task.completed) {
          const updatedCompletedTasks = [...completedTasks, task];
          setCompletedTasks(updatedCompletedTasks);
          // Save the updated completed tasks to localStorage
          localStorage.setItem("completedTasks", JSON.stringify(updatedCompletedTasks));
        }
        // Filter returns a new array with the elements that meet the callback condition, so filter out the ones not equal to the task
        taskDay.tasks = taskDay.tasks.filter((t) => t !== task);
      }
      return taskDay;
    });
    setTasks(newTasks);
  
    // Save the updated tasks to localStorage
    saveToLocalStorage(newTasks);
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
      <Completed className="completed" completedTasks={completedTasks} setCompletedTasks={setCompletedTasks} />
    </div>
  );
};


export default TimeTable;
