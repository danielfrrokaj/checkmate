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

    // Enable drag and drop
    this.taskList.addEventListener('dragstart', (e) => this.handleDragStart(e));
    this.taskList.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.taskList.addEventListener('drop', (e) => this.handleDrop(e));
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
        priority: this.tasks.length + 1,
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
    this.updatePriorities();
    this.saveTasks();
    this.renderTasks();
  }

  updatePriorities() {
    this.tasks.forEach((task, index) => {
      task.priority = index + 1;
    });
  }

  handleDragStart(e) {
    const li = e.target.closest('li');
    if (li) {
      e.dataTransfer.setData('text/plain', li.dataset.taskId);
      li.classList.add('dragging');
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    const li = e.target.closest('li');
    if (li && !li.classList.contains('dragging')) {
      const draggingItem = this.taskList.querySelector('.dragging');
      const siblings = [...this.taskList.querySelectorAll('li:not(.dragging)')];
      const nextSibling = siblings.find(sibling => {
        const rect = sibling.getBoundingClientRect();
        return e.clientY <= rect.top + rect.height / 2;
      });

      if (nextSibling) {
        this.taskList.insertBefore(draggingItem, nextSibling);
      } else {
        this.taskList.appendChild(draggingItem);
      }
    }
  }

  handleDrop(e) {
    e.preventDefault();
    const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
    const items = [...this.taskList.querySelectorAll('li')];
    const newTasks = items.map(item => {
      return this.tasks.find(t => t.id === parseInt(item.dataset.taskId));
    });

    this.tasks = newTasks;
    this.updatePriorities();
    this.saveTasks();
    this.renderTasks();
  }

  renderTasks() {
    this.taskList.innerHTML = '';
    
    this.tasks.sort((a, b) => a.priority - b.priority);
    
    this.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      li.draggable = true;
      li.dataset.taskId = task.id;
      
      const priorityBadge = document.createElement('span');
      priorityBadge.className = 'priority-badge';
      priorityBadge.textContent = task.priority;
      
      const span = document.createElement('span');
      span.textContent = task.text;
      
      const taskActions = document.createElement('div');
      taskActions.className = 'task-actions';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => this.toggleTask(task.id));
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-task';
      deleteButton.textContent = '×';
      deleteButton.addEventListener('click', () => this.deleteTask(task.id));
      
      taskActions.appendChild(checkbox);
      taskActions.appendChild(deleteButton);
      
      li.appendChild(priorityBadge);
      li.appendChild(span);
      li.appendChild(taskActions);
      this.taskList.appendChild(li);
    });
  }
}

// Initialize task manager when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  const taskManager = new TaskManager();
}); 