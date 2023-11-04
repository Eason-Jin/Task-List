import React from "react";
import "./TimeTable.css";

const TimeTable = ({ tasks, handleCheckboxChange, handleDeleteTask }) => {
  return (
    <div className="time-table">
      <table>
        <thead>
          <tr>
            <th className="time-column">Time</th>
            <th className="day-column">Monday</th>
            <th className="day-column">Tuesday</th>
            <th className="day-column">Wednesday</th>
            <th className="day-column">Thursday</th>
            <th className="day-column">Friday</th>
          </tr>
        </thead>
        <tbody>
          {Array(7)
            .fill(null)
            .map((_, index) => (
              <tr key={index}>
                <td className="time-column">{index + 9}:00</td>
                {tasks.map((taskDay) => (
                  <td className="day-column" key={taskDay.day}>
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
                          <button onClick={() => handleDeleteTask(task, taskDay.day)}>
                            X
                          </button>
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
