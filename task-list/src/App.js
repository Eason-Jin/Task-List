import './App.css';
import { useState } from 'react';

const days = [
  { day: "Mon", tasks: ["1"] },
  { day: "Tue", tasks: ["2"] },
  { day: "Wed", tasks: ["3"] },
  { day: "Thur", tasks: ["4"] },
  { day: "Fri", tasks: ["5"] },
]

const Row = (props) => {
  const { day, tasks } = props;
  return (
    <tr>
      <td>{day}</td>
      <td>{tasks}</td>
    </tr>
  )

}
const Table = (props) => {
  const { data } = props;
  return (
    <table>
      <tbody>
        {data.map(row =>
          <Row day={row.day} tasks={row.tasks} />
        )}
      </tbody>
    </table>
  )
}
function App() {

  const [rows, setRows] = useState(days);
  return (
    <div className="App">
      <div>Table:</div>
      <Table data={rows} />
    </div>
  );
}

export default App;
