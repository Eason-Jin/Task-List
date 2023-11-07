import React, { useState, useEffect } from 'react'
import './App.css'
import TimeTable from './components/TimeTable/TimeTable'
import TaskInput from './components/TaskInput/TaskInput'
import Completed from './components/Completed/Completed'

function App() {
  class Task {
    constructor(task, time, completed = false) {
      this.task = task
      this.time = time
      this.completed = completed
    }
  }

  const [completedTasks, setCompletedTasks] = useState([])
  const [message, setMessage] = useState("");

  const [tasks, setTasks] = useState([
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
  ])

  // Save tasks to local storage
  const saveToLocalStorage = updatedTasks => {
    localStorage.setItem('tasks', JSON.stringify(updatedTasks))
  }

  // Load tasks from local storage
  useEffect(() => {
    const storedTasks = localStorage.getItem('tasks')
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks))
    }
  }, [])

  // Load completed tasks from local storage
  useEffect(() => {
    const storedTasks = localStorage.getItem('completedTasks')
    if (storedTasks) {
      setCompletedTasks(JSON.parse(storedTasks))
    }
  }, [])

  const handleAddTask = task => {
    const newTasks = tasks.map((taskDay, id) => {
      var success = false;
      if (taskDay.day === task.day) {
        taskDay.tasks.push(new Task(task.task, task.time))
        success = true;
      }
      if (id === tasks.length - 1 && !success) {
        setMessage("Please select a day and time")
        setTimeout(() => {
          setMessage("");
        }, 2000);
      }
      return taskDay
    })
    setTasks(newTasks)
    saveToLocalStorage(newTasks)
  }

  const handleCheckboxChange = (task, day) => {
    const newTasks = tasks.map(taskDay => {
      if (taskDay.day === day) {
        taskDay.tasks = taskDay.tasks.map(t => {
          if (t === task) {
            t.completed = !t.completed
          }
          return t
        })
      }
      return taskDay
    })
    setTasks(newTasks)

    // Save the updated tasks to localStorage
    saveToLocalStorage(newTasks)
  }

  const handleDeleteTask = (task, day) => {
    const newTasks = tasks.map(taskDay => {
      if (taskDay.day === day) {
        // If the task is completed, add it to the completed tasks array
        if (task.completed) {
          const updatedCompletedTasks = [...completedTasks, task]
          setCompletedTasks(updatedCompletedTasks)
          // Save the updated completed tasks to localStorage
          localStorage.setItem(
            'completedTasks',
            JSON.stringify(updatedCompletedTasks)
          )
        }
        // Filter returns a new array with the elements that meet the callback condition, so filter out the ones not equal to the task
        taskDay.tasks = taskDay.tasks.filter(t => t !== task)
      }
      return taskDay
    })
    setTasks(newTasks)

    // Save the updated tasks to localStorage
    saveToLocalStorage(newTasks)
  }

  return (
    <div className="app">
      <div className="left">
        <div>
          <TimeTable tasks={tasks} handleCheckboxChange={handleCheckboxChange} handleDeleteTask={handleDeleteTask} />
        </div>
        <div>
          <TaskInput onAddTask={handleAddTask} tasks={tasks} setTasks={setTasks} message={message} setMessage={setMessage} />
        </div>
      </div>
      <div className="right">
        <div>
          <Completed completedTasks={completedTasks} setCompletedTasks={setCompletedTasks} />
        </div>
      </div>
    </div>
  );
}

export default App
