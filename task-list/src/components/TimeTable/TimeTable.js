import React from 'react';
import './TimeTable.css';

const daysOfWeek = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const tasks = [['1'], ['2'], ['3'], ['4'], ['5']];
const timeSlots = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM'];

const Timetable = () => {
  return (
    <div className="timetable">
      {daysOfWeek.map((day) => (
        <div key={day} className="cell day-header">
          {day}
        </div>
      ))}
      {timeSlots.map((time) => (
        <div key={time} className="time-row">
          <div className="cell time-header">{time}</div>
          {tasks.map((task) => (
            <div key={task} className="cell">
              {task}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Timetable;
