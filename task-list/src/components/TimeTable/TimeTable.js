import React from "react";

const TimeTable = ({ tasks, handleCheckboxChange, handleDeleteTask }) => {
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
