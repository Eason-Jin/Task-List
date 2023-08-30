import React from 'react';
import './TimeTable.css';

const daysOfWeek = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const taskList = [['1'], ['2'], ['3'], ['4'], ['5']];
const timeSlots = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM'];

/* TODO: refactor tasks as object and time as hashmap
task will have fields for name, time, and day
time will have time as key and array of tasks as value
*/

const Timetable = () => {
  return (
    <div className="timetable">
      <table>
        <tr>
          {daysOfWeek.map((day, index) => (
            <th key={index}>{day}</th>
          ))}
        </tr>
        <tbody>
          {taskList.map((tasks, index) => (
            <tr key={index}>
              <td>{timeSlots[index]}</td>
              {daysOfWeek.map((day, index) => (
                <td key={index}>
                  {tasks.map((task, index) => (
                    task === null? <div key={index}></div> : <div key={index}>{task}</div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Timetable;
