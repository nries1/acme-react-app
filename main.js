const API = 'https://acme-users-api-rev.herokuapp.com/api';

const fetchUser = async () => {
  const storage = window.localStorage;
  const userId = storage.getItem('userId');
  if (userId) {
    try {
      return (await axios.get(`${API}/users/detail/${userId}`)).data;
    } catch (ex) {
      storage.removeItem('userId');
      return fetchUser();
    }
  }
  const user = (await axios.get(`${API}/users/random`)).data;
  storage.setItem('userId', user.id);
  return user;
};

const { render } = ReactDOM;
const { Component } = React;
const { HashRouter, Route, Link, Switch, Redirect } = ReactRouterDOM;

//{ notes, archived, update, destroy }
const Notes = props => {
  const { notes, archived, destroy, update } = props;
  return (
    <div className="all-notes-container">
      {notes
        .filter(note => note.archived === archived)
        .map((note, index) => (
          <div className="card note-card" key={note.id}>
            <div className="card-body">
              <div className="card-title">Note {index + 1}</div>
              <Link to={`/notes/${note.id}`} className="card-text">
                {note.text}
              </Link>
              <div className="card-btn-container">
                <button
                  onClick={() => {
                    update({ ...note, archived: !note.archived });
                  }}
                  className="btn btn-outline-primary btn-sm"
                >
                  {note.archived ? `De-Archive` : `Archive`}
                </button>
                <button
                  onClick={() => {
                    destroy(note);
                  }}
                  className="btn btn-outline-danger btn-sm"
                >
                  Destroy
                </button>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

const Nav = ({ path, notes }) => {
  const archived = notes.filter(note => note.archived);
  return (
    <nav className="navbar navbar-dark bg-dark">
      <Link to="/notes" className={path === '/notes' ? 'selected' : ''}>
        Notes ({notes.length - archived.length})
      </Link>
      <Link to="/archived" className={path === '/archived' ? 'selected' : ''}>
        Archived ({archived.length})
      </Link>
      <Link
        to="/notes/create"
        className={path === '/notes/create' ? 'selected' : ''}
      >
        Create
      </Link>
    </nav>
  );
};

class Create extends Component {
  constructor() {
    super();
    this.state = {
      text: '',
      error: ''
    };
    this.create = this.create.bind(this);
  }
  create() {
    this.props
      .create({ text: this.state.text })
      .then(() => this.props.history.push('/notes'))
      .catch(ex => this.setState({ error: ex.response.data.message }));
  }
  render() {
    const { text, error } = this.state;
    const { create } = this;
    return (
      <form onSubmit={ev => ev.preventDefault()}>
        {!!error && <div className="error">{error}</div>}
        <div className="form-group">
          <input
            className="form-control"
            value={text}
            placeholder="create new note"
            onChange={ev => this.setState({ text: ev.target.value })}
          />
          <button
            className="btn btn-outline-primary"
            disabled={!text}
            onClick={create}
          >
            Create
          </button>
        </div>
      </form>
    );
  }
}

class Update extends React.Component {
  constructor(props) {
    super();
    this.state = {
      noteId: props.match.params.id,
      userId: props.userId,
      note: null,
      update: props.update
    };
  }
  handleSubmit = event => {
    event.preventDefault();
    this.state.update(this.state.note);
    this.props.history.push('/notes');
  };
  async componentDidMount() {
    const noteId = this.state.noteId;
    const notes = (await axios.get(`${API}/users/${this.state.userId}/notes`))
      .data;
    const note = notes.filter(note => note.id === noteId)[0];
    this.setState({ note });
  }
  render() {
    const note = this.state.note;
    return (
      <div>
        <h3>You are editing your note.</h3>
        <form onSubmit={this.handleSubmit}>
          <div className="form-group">
            <input
              className="form-control"
              type="text"
              name="text"
              value={note ? note.text : ''}
              onChange={event => {
                note.text = event.target.value;
                this.setState({ note });
              }}
            />
          </div>
          <button className="btn btn-outline-primary btn-sm">Save</button>
        </form>
      </div>
    );
  }
}

class App extends Component {
  constructor() {
    super();
    this.state = {
      user: {},
      notes: []
    };
    this.update = this.update.bind(this);
    this.create = this.create.bind(this);
    this.destroy = this.destroy.bind(this);
  }
  async destroy(note) {
    await axios.delete(`${API}/users/${this.state.user.id}/notes/${note.id}`);
    this.setState({
      notes: this.state.notes.filter(_note => _note.id !== note.id)
    });
  }
  async componentDidMount() {
    const user = await fetchUser();
    const notes = (await axios.get(`${API}/users/${user.id}/notes`)).data;
    this.setState({ notes, user });
  }
  async update(note) {
    const updated = (await axios.put(
      `${API}/users/${this.state.user.id}/notes/${note.id}`,
      { archived: note.archived, text: note.text }
    )).data;
    this.setState({
      notes: this.state.notes.map(note =>
        note.id === updated.id ? updated : note
      )
    });
  }
  async create(note) {
    const created = (await axios.post(
      `${API}/users/${this.state.user.id}/notes`,
      note
    )).data;
    const notes = [...this.state.notes, created];
    this.setState({ notes });
  }
  render() {
    const { notes, user } = this.state;
    const { update, create, destroy } = this;
    console.log('user in the app ', user);
    return (
      <HashRouter>
        <Route
          render={({ location }) => (
            <Nav path={location.pathname} notes={notes} />
          )}
        />
        <h3>Acme Note--taker for {user.id ? user.fullName : ''}</h3>
        <Switch>
          <Route
            exact
            path="/notes"
            render={props => (
              <Notes
                destroy={destroy}
                archived={false}
                notes={notes}
                update={update}
                {...props}
              />
            )}
          />
          <Route
            path="/notes/create"
            render={({ history }) => (
              <Create history={history} create={create} notes={notes} />
            )}
          />
          <Route
            path="/archived"
            render={() => (
              <Notes
                destroy={destroy}
                archived={true}
                notes={notes}
                update={update}
              />
            )}
          />
          <Route
            path="/notes/:id"
            render={props => (
              <Update {...props} userId={user.id} update={update} />
            )}
          />
          <Redirect to="/notes" />
        </Switch>
      </HashRouter>
    );
  }
}
const root = document.querySelector('#root');
render(<App />, root);
