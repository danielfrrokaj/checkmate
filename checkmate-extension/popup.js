class TaskManager {
  constructor() {
    this.taskInput = document.getElementById('taskInput');
    this.addTaskButton = document.getElementById('addTask');
    this.taskList = document.getElementById('taskList');
    
    this.tasks = [];
    this.initializeEventListeners();
    this.loadTasks();
  }

  initializeEventListeners() {
    this.addTaskButton.addEventListener('click', () => this.addTask());
    this.taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTask();
      }
    });
  }

  async loadTasks() {
    const result = await chrome.storage.sync.get('tasks');
    this.tasks = result.tasks || [];
    this.renderTasks();
  }

  async saveTasks() {
    await chrome.storage.sync.set({ tasks: this.tasks });
  }

  addTask() {
    const taskText = this.taskInput.value.trim();
    if (taskText) {
      const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString()
      };
      
      this.tasks.push(task);
      this.saveTasks();
      this.renderTasks();
      this.taskInput.value = '';
    }
  }

  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks();
      this.renderTasks();
    }
  }

  deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.saveTasks();
    this.renderTasks();
  }

  renderTasks() {
    this.taskList.innerHTML = '';
    
    this.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => this.toggleTask(task.id));
      
      const span = document.createElement('span');
      span.textContent = task.text;
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-task';
      deleteButton.textContent = '×';
      deleteButton.addEventListener('click', () => this.deleteTask(task.id));
      
      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteButton);
      this.taskList.appendChild(li);
    });
  }
}

// Initialize task manager when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  const taskManager = new TaskManager();
}); 