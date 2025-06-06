class TeamToolsApp {
    constructor() {
        this.currentClass = null;
        this.classes = {};
        this.currentTool = null;
        this.currentResults = null;
        this.teamEditor = new TeamEditor(this);
        this.currentEditingClass = null;
        this.init();
    }

    async init() {
        await this.loadClasses();
        this.setupEventListeners();
        this.renderClassList();
        
        // Setup menu event listeners
        window.electronAPI.onMenuNewClass(() => this.showClassEdit());
        window.electronAPI.onMenuTeamFormation(() => this.showTeamTools());
        window.electronAPI.onMenuPairFormation(() => this.showPairTools());
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('homeBtn')?.addEventListener('click', () => this.showMainMenu());
        document.getElementById('resultsHomeBtn')?.addEventListener('click', () => this.showMainMenu());
        
        // Class Management
        document.getElementById('editClassInfoBtn').addEventListener('click', () => this.showClassEdit());
        
        // Class Edit
        document.getElementById('createClassBtn').addEventListener('click', () => this.createOrEditClass());
        document.getElementById('manualEntryBtn').addEventListener('click', () => this.showManualEntry());
        document.getElementById('csvImportBtn').addEventListener('click', () => this.showCSVImport());
        document.getElementById('csvHelperBtn').addEventListener('click', () => this.showCSVHelper());
        document.getElementById('addStudentBtn').addEventListener('click', () => this.addStudent());
        document.getElementById('saveClassBtn').addEventListener('click', () => this.saveClass());
        
        // CSV Helper
        document.getElementById('formatCSVBtn').addEventListener('click', () => this.formatCSVData());
        document.getElementById('selectCSVFileBtn').addEventListener('click', () => this.selectCSVFile());
        document.getElementById('importCSVDataBtn').addEventListener('click', () => this.importCSVData());
        
        // Team Formation Tools
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.getAttribute('data-tool');
                this.runTeamFormation(tool);
            });
        });
        
        // Results
        document.getElementById('regenerateBtn')?.addEventListener('click', () => this.regenerateTeams());
        document.getElementById('saveResultsBtn')?.addEventListener('click', () => this.saveResults());
        document.getElementById('printResultsBtn')?.addEventListener('click', () => this.printResults());
    }

    async loadClasses() {
        try {
            this.classes = await window.electronAPI.loadAllClasses();
        } catch (error) {
            console.error('Error loading classes:', error);
            this.classes = {};
        }
    }

    renderClassList() {
        const classList = document.getElementById('classList');
        classList.innerHTML = '';

        if (Object.keys(this.classes).length === 0) {
            classList.innerHTML = '<p class="no-classes">No classes created yet. Click "Create Class" to get started.</p>';
            return;
        }

        Object.entries(this.classes).forEach(([name, classData]) => {
            const classItem = document.createElement('div');
            classItem.className = `class-item ${this.currentClass === name ? 'active' : ''}`;
            classItem.innerHTML = `
                <h4>${name}</h4>
                <p>${classData.students.length} students</p>
                <div class="class-actions">
                    <button class="btn btn-small btn-secondary edit-class-btn" data-class-name="${name}">Edit</button>
                    <button class="btn btn-small btn-danger delete-class-btn" data-class-name="${name}">Delete</button>
                </div>
            `;
            
            // Add click listener for selecting class (but not on buttons)
            classItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn')) {
                    this.selectClass(name);
                }
            });
            
            classList.appendChild(classItem);
        });

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const className = e.target.getAttribute('data-class-name');
                this.editClass(className);
            });
        });

        document.querySelectorAll('.delete-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const className = e.target.getAttribute('data-class-name');
                this.deleteClass(className);
            });
        });
    }

    selectClass(className) {
        this.currentClass = className;
        this.renderClassList();
        this.updateToolsAvailability();
    }

    editClass(className) {
        this.currentEditingClass = className;
        this.showClassEdit();
        
        // Pre-populate the form with existing class data
        document.getElementById('classNameInput').value = className;
        
        // Show the student data section immediately
        this.createOrEditClass();
    }

    async deleteClass(className) {
        const confirmed = confirm(`Are you sure you want to delete "${className}"? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            // Remove from local classes object
            delete this.classes[className];
            
            // If this was the current class, clear it
            if (this.currentClass === className) {
                this.currentClass = null;
            }
            
            // Delete from persistent storage using the new API
            const result = await window.electronAPI.deleteClass(className);
            if (!result.success) {
                throw new Error(result.error);
            }
            
            // Re-render the class list
            this.renderClassList();
            this.updateToolsAvailability();
            
            alert(`Class "${className}" has been deleted successfully.`);
        } catch (error) {
            alert('Error deleting class: ' + error.message);
            // Reload classes to ensure consistency
            await this.loadClasses();
            this.renderClassList();
        }
    }

    updateToolsAvailability() {
        const toolButtons = document.querySelectorAll('.btn-tool');
        const hasActiveClass = this.currentClass && this.classes[this.currentClass];
        
        toolButtons.forEach(btn => {
            btn.disabled = !hasActiveClass;
        });
    }

    showMainMenu() {
        // Exit edit mode if active
        if (this.teamEditor.isEditMode) {
            this.teamEditor.disableEditMode();
        }
        
        // Clear editing state
        this.currentEditingClass = null;
        
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById('mainMenu').classList.add('active');
    }

    showClassEdit() {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById('classEditScreen').classList.add('active');
        
        // Reset form if not editing existing class
        if (!this.currentEditingClass) {
            document.getElementById('classNameInput').value = '';
            document.getElementById('studentDataSection').classList.add('hidden');
            this.hideAllDataInputSections();
        }
        
        // Use setTimeout to ensure the input is ready and focused immediately
        setTimeout(() => {
            const input = document.getElementById('classNameInput');
            input.focus();
            input.select(); // Select any existing text for easy replacement
        }, 0);
    }

    createOrEditClass() {
        const className = document.getElementById('classNameInput').value.trim();
        if (!className) {
            alert('Please enter a class name');
            return;
        }

        // Check if class name already exists and we're not editing it
        if (this.classes[className] && this.currentEditingClass !== className) {
            alert('A class with this name already exists. Please choose a different name.');
            return;
        }

        // If we're editing and the name changed, we need to handle the rename
        if (this.currentEditingClass && this.currentEditingClass !== className) {
            // Rename the class
            this.classes[className] = { ...this.classes[this.currentEditingClass] };
            this.classes[className].name = className;
            delete this.classes[this.currentEditingClass];
            
            // Update current class if it was the one being edited
            if (this.currentClass === this.currentEditingClass) {
                this.currentClass = className;
            }
        }

        // Create new class or ensure existing class exists
        if (!this.classes[className]) {
            this.classes[className] = {
                name: className,
                students: [],
                created: new Date().toISOString()
            };
        }

        this.currentEditingClass = className;
        document.getElementById('studentDataSection').classList.remove('hidden');
        this.renderStudentList();
    }

    showManualEntry() {
        this.hideAllDataInputSections();
        document.getElementById('manualEntrySection').classList.remove('hidden');
        document.getElementById('studentName').focus();
    }

    showCSVImport() {
        this.hideAllDataInputSections();
        document.getElementById('csvImportSection').classList.remove('hidden');
    }

    showCSVHelper() {
        this.hideAllDataInputSections();
        document.getElementById('csvHelperSection').classList.remove('hidden');
    }

    hideAllDataInputSections() {
        document.getElementById('manualEntrySection').classList.add('hidden');
        document.getElementById('csvImportSection').classList.add('hidden');
        document.getElementById('csvHelperSection').classList.add('hidden');
    }

    addStudent() {
        if (!this.currentEditingClass) {
            alert('Please create or select a class first');
            return;
        }

        const name = document.getElementById('studentName').value.trim();
        const score = parseInt(document.getElementById('studentScore').value);
        const sex = document.getElementById('studentSex').value;

        if (!name || isNaN(score) || !sex) {
            alert('Please fill in all fields');
            return;
        }

        if (score < 0 || score > 100) {
            alert('Score must be between 0 and 100');
            return;
        }

        // Check for duplicate student names
        const existingStudent = this.classes[this.currentEditingClass].students.find(
            student => student.name.toLowerCase() === name.toLowerCase()
        );
        
        if (existingStudent) {
            alert('A student with this name already exists in the class');
            return;
        }

        const student = { name, score, sex };
        this.classes[this.currentEditingClass].students.push(student);

        // Clear form
        document.getElementById('studentName').value = '';
        document.getElementById('studentScore').value = '';
        document.getElementById('studentSex').value = '';

        this.renderStudentList();
        document.getElementById('studentName').focus();
    }

    renderStudentList() {
        if (!this.currentEditingClass) {
            return;
        }

        const studentsTable = document.getElementById('studentsTable');
        const students = this.classes[this.currentEditingClass].students;

        if (students.length === 0) {
            studentsTable.innerHTML = '<p>No students added yet.</p>';
            document.getElementById('saveClassBtn').classList.add('hidden');
            return;
        }

        let html = `
            <table class="students-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Score</th>
                        <th>Gender</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        students.forEach((student, index) => {
            html += `
                <tr>
                    <td>${student.name}</td>
                    <td>${student.score}</td>
                    <td>${student.sex === 'M' ? 'Male' : 'Female'}</td>
                    <td><button class="delete-btn" onclick="app.removeStudent(${index})">Remove</button></td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        studentsTable.innerHTML = html;
        document.getElementById('saveClassBtn').classList.remove('hidden');
    }

    removeStudent(index) {
        if (!this.currentEditingClass) {
            return;
        }
        this.classes[this.currentEditingClass].students.splice(index, 1);
        this.renderStudentList();
    }

    async saveClass() {
        if (!this.currentEditingClass) {
            alert('No class to save');
            return;
        }

        try {
            const result = await window.electronAPI.saveClassData(this.classes[this.currentEditingClass]);
            if (result.success) {
                alert('Class saved successfully!');
                this.renderClassList();
                this.updateToolsAvailability();
                
                // Clear editing state
                this.currentEditingClass = null;
            } else {
                alert('Error saving class: ' + result.error);
            }
        } catch (error) {
            alert('Error saving class: ' + error.message);
        }
    }

    formatCSVData() {
        if (!this.currentEditingClass) {
            alert('Please create or select a class first');
            return;
        }

        const input = document.getElementById('csvHelperInput').value.trim();
        if (!input) {
            alert('Please enter some data first');
            return;
        }

        try {
            const students = CSVHelper.parseCSVInput(input);
            this.classes[this.currentEditingClass].students = students;
            this.renderStudentList();
            alert(`Successfully formatted ${students.length} students`);
        } catch (error) {
            alert('Error formatting data: ' + error.message);
        }
    }

    async selectCSVFile() {
        try {
            const result = await window.electronAPI.showOpenDialog();
            if (!result.canceled && result.filePaths.length > 0) {
                const fileResult = await window.electronAPI.readFile(result.filePaths[0]);
                if (fileResult.success) {
                    document.getElementById('csvPreviewText').value = fileResult.data;
                    document.getElementById('csvPreview').classList.remove('hidden');
                } else {
                    alert('Error reading file: ' + fileResult.error);
                }
            }
        } catch (error) {
            alert('Error selecting file: ' + error.message);
        }
    }

    importCSVData() {
        if (!this.currentEditingClass) {
            alert('Please create or select a class first');
            return;
        }

        const csvData = document.getElementById('csvPreviewText').value.trim();
        if (!csvData) {
            alert('No data to import');
            return;
        }

        try {
            const students = CSVHelper.parseCSVFile(csvData);
            this.classes[this.currentEditingClass].students = students;
            this.renderStudentList();
            alert(`Successfully imported ${students.length} students`);
        } catch (error) {
            alert('Error importing data: ' + error.message);
        }
    }

    runTeamFormation(tool) {
        if (!this.currentClass || !this.classes[this.currentClass]) {
            alert('Please select a class first');
            return;
        }

        const students = this.classes[this.currentClass].students;
        if (students.length < 2) {
            alert('You need at least 2 students to form teams');
            return;
        }

        this.currentTool = tool;
        let results;

        try {
            switch (tool) {
                case 'heterogeneous-teams':
                    results = TeamFormation.createHeterogeneousTeams(students);
                    break;
                case 'random-teams':
                    results = TeamFormation.createRandomTeams(students);
                    break;
                case 'mixed-ability-teams':
                    results = TeamFormation.createMixedAbilityTeams(students);
                    break;
                case 'similar-ability-teams':
                    results = TeamFormation.createSimilarAbilityTeams(students);
                    break;
                case 'same-sex-teams':
                    results = TeamFormation.createSameSexTeams(students);
                    break;
                case 'mixed-sex-teams':
                    results = TeamFormation.createMixedSexTeams(students);
                    break;
                case 'high-low-pairs':
                    results = TeamFormation.createHighLowPairs(students);
                    break;
                case 'high-medium-pairs':
                    results = TeamFormation.createHighMediumPairs(students);
                    break;
                case 'random-pairs':
                    results = TeamFormation.createRandomPairs(students);
                    break;
                case 'similar-ability-pairs':
                    results = TeamFormation.createSimilarAbilityPairs(students);
                    break;
                case 'same-sex-pairs':
                    results = TeamFormation.createSameSexPairs(students);
                    break;
                case 'mixed-sex-pairs':
                    results = TeamFormation.createMixedSexPairs(students);
                    break;
                case 'random-two-teams':
                    results = TeamFormation.createRandomTwoTeams(students);
                    break;
                case 'balanced-two-teams':
                    results = TeamFormation.createBalancedTwoTeams(students);
                    break;
                default:
                    throw new Error('Unknown tool: ' + tool);
            }

            this.showResults(results, tool);
        } catch (error) {
            alert('Error creating teams: ' + error.message);
        }
    }

    showResults(results, tool) {
        this.currentResults = results;
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById('resultsScreen').classList.add('active');

        const title = this.getToolDisplayName(tool);
        document.getElementById('resultsTitle').textContent = title;

        this.renderResults(results, tool);
        this.updateResultsActions();
    }

    updateResultsActions() {
        const resultsActions = document.querySelector('.results-actions');
        
        // Remove existing edit button if present
        const existingEditBtn = document.getElementById('editTeamsBtn');
        if (existingEditBtn) {
            existingEditBtn.remove();
        }
        
        // Add edit button
        const editButton = document.createElement('button');
        editButton.id = 'editTeamsBtn';
        editButton.className = 'btn btn-edit-mode';
        editButton.textContent = 'Edit Teams';
        
        editButton.addEventListener('click', () => {
            if (this.teamEditor.isEditMode) {
                this.teamEditor.disableEditMode();
                editButton.textContent = 'Edit Teams';
                editButton.classList.remove('active');
            } else {
                this.teamEditor.enableEditMode(this.currentResults, this.currentTool);
                editButton.textContent = 'Exit Edit Mode';
                editButton.classList.add('active');
            }
        });
        
        // Insert edit button as the first action
        resultsActions.insertBefore(editButton, resultsActions.firstChild);
    }

    getToolDisplayName(tool) {
        const names = {
            'heterogeneous-teams': 'Heterogeneous Teams',
            'random-teams': 'Random Teams',
            'mixed-ability-teams': 'Mixed Ability Teams',
            'similar-ability-teams': 'Similar Ability Teams',
            'same-sex-teams': 'Same Sex Teams',
            'mixed-sex-teams': 'Mixed Sex Teams',
            'high-low-pairs': 'High-Low Pairs',
            'high-medium-pairs': 'High-Medium Pairs',
            'random-pairs': 'Random Pairs',
            'similar-ability-pairs': 'Similar Ability Pairs',
            'same-sex-pairs': 'Same Sex Pairs',
            'mixed-sex-pairs': 'Mixed Sex Pairs',
            'random-two-teams': 'Random Two Teams',
            'balanced-two-teams': 'Balanced Two Teams'
        };
        return names[tool] || tool;
    }

    renderResults(results, tool) {
        const resultsContent = document.getElementById('resultsContent');
        resultsContent.innerHTML = '';

        if (tool.includes('pairs')) {
            this.renderPairsResults(results, resultsContent);
        } else if (tool.includes('two-teams')) {
            this.renderTwoTeamsResults(results, resultsContent);
        } else {
            this.renderTeamsResults(results, resultsContent);
        }
    }

    renderTeamsResults(teams, container) {
        teams.forEach((team, index) => {
            const teamCard = document.createElement('div');
            teamCard.className = 'team-card';
            teamCard.innerHTML = `
                <h3>Team ${index + 1}</h3>
                ${team.map(student => `
                    <div class="team-member">
                        <div class="member-info">
                            <div class="member-name">${student.name}</div>
                            <div class="member-details">Score: ${student.score} | ${student.sex === 'M' ? 'Male' : 'Female'}</div>
                        </div>
                    </div>
                `).join('')}
            `;
            container.appendChild(teamCard);
        });
    }

    renderPairsResults(pairs, container) {
        pairs.forEach((pair, index) => {
            const pairCard = document.createElement('div');
            pairCard.className = 'pair-card';
            pairCard.innerHTML = `
                <h3>Pair ${index + 1}</h3>
                ${pair.map(student => `
                    <div class="pair-member">
                        <div class="member-info">
                            <div class="member-name">${student.name}</div>
                            <div class="member-details">Score: ${student.score} | ${student.sex === 'M' ? 'Male' : 'Female'}</div>
                        </div>
                    </div>
                `).join('')}
            `;
            container.appendChild(pairCard);
        });
    }

    renderTwoTeamsResults(teams, container) {
        teams.forEach((team, index) => {
            const teamCard = document.createElement('div');
            teamCard.className = 'team-card';
            teamCard.innerHTML = `
                <h3>Team ${index + 1}</h3>
                ${team.map(student => `
                    <div class="team-member">
                        <div class="member-info">
                            <div class="member-name">${student.name}</div>
                            <div class="member-details">Score: ${student.score} | ${student.sex === 'M' ? 'Male' : 'Female'}</div>
                        </div>
                    </div>
                `).join('')}
            `;
            container.appendChild(teamCard);
        });
    }

    regenerateTeams() {
        if (this.currentTool) {
            // If in edit mode, exit first
            if (this.teamEditor.isEditMode) {
                this.teamEditor.disableEditMode();
                const editButton = document.getElementById('editTeamsBtn');
                if (editButton) {
                    editButton.textContent = 'Edit Teams';
                    editButton.classList.remove('active');
                }
            }
            
            this.runTeamFormation(this.currentTool);
        }
    }

    async saveResults() {
        try {
            const result = await window.electronAPI.showSaveDialog();
            if (!result.canceled) {
                const resultsContent = document.getElementById('resultsContent').innerText;
                const saveResult = await window.electronAPI.writeFile(result.filePath, resultsContent);
                if (saveResult.success) {
                    alert('Results saved successfully!');
                } else {
                    alert('Error saving results: ' + saveResult.error);
                }
            }
        } catch (error) {
            alert('Error saving results: ' + error.message);
        }
    }

    printResults() {
        window.print();
    }
}

// Initialize the app
const app = new TeamToolsApp();