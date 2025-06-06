class TeamEditor {
    constructor(app) {
        this.app = app;
        this.isEditMode = false;
        this.draggedStudent = null;
        this.originalTeams = null;
        this.currentTeams = null;
        this.toolType = null;
        this.unassignedStudents = [];
        this.boundEventHandlers = {}; // Store bound event handlers
    }

    enableEditMode(teams, toolType) {
        // Clear any previous state
        this.reset();

        this.isEditMode = true;
        this.originalTeams = JSON.parse(JSON.stringify(teams));
        this.currentTeams = JSON.parse(JSON.stringify(teams));
        this.toolType = toolType;
        this.unassignedStudents = []; // Start with empty unassigned pool

        this.renderEditInterface();
        // Note: renderEditInterface → renderEditableTeams → setupDragAndDrop()
    }

    disableEditMode() {
        this.isEditMode = false;
        this.draggedStudent = null;
        this.removeDragAndDropListeners();

        // Clean up the interface
        this.cleanupEditInterface();

        // Re-render without edit controls
        this.app.renderResults(this.currentTeams, this.toolType);
    }

    reset() {
        // Clear all state when switching between team formations
        this.isEditMode = false;
        this.draggedStudent = null;
        this.originalTeams = null;
        this.currentTeams = null;
        this.toolType = null;
        this.unassignedStudents = [];

        // Remove any existing event listeners
        this.removeDragAndDropListeners();
    }

    renderEditInterface() {
        const resultsContent = document.getElementById('resultsContent');

        // Add edit controls
        const editControls = document.createElement('div');
        editControls.className = 'edit-controls';
        editControls.innerHTML = `
            <h3>Team Editor - Drag students to move them between teams</h3>
            <div class="edit-actions">
                <button id="saveEditsBtn" class="btn btn-success btn-small">Save Changes</button>
                <button id="cancelEditsBtn" class="btn btn-secondary btn-small">Cancel</button>
                <button id="resetTeamsBtn" class="btn btn-secondary btn-small">Reset to Original</button>
                <button id="autoBalanceBtn" class="btn btn-primary btn-small">Auto Balance</button>
            </div>
        `;
        resultsContent.parentNode.insertBefore(editControls, resultsContent);

        // Add unassigned students area
        const unassignedArea = document.createElement('div');
        unassignedArea.className = 'unassigned-students';
        unassignedArea.innerHTML = `
            <h4>Unassigned Students</h4>
            <div id="unassignedList" class="unassigned-list">
                <p>All students are assigned to teams</p>
            </div>
        `;
        resultsContent.parentNode.insertBefore(unassignedArea, resultsContent);

        // Render teams with edit capabilities
        this.renderEditableTeams();

        // Setup edit‐control buttons (happens only once)
        this.setupEditControls();
    }

    renderEditableTeams() {
        const resultsContent = document.getElementById('resultsContent');
        resultsContent.innerHTML = ''; // wipe out old team cards

        if (this.toolType.includes('pairs')) {
            this.renderEditablePairs(resultsContent);
        } else if (this.toolType.includes('two-teams')) {
            this.renderEditableTwoTeams(resultsContent);
        } else {
            this.renderEditableTeamGroups(resultsContent);
        }

        this.updateUnassignedList();

        // Every time we re-render, we must re-initialize drag‐and‐drop listeners
        this.setupDragAndDrop();
    }

    renderEditableTeamGroups(container) {
        this.currentTeams.forEach((team, teamIndex) => {
            const teamCard = this.createEditableTeamCard(team, teamIndex, 'Team');
            container.appendChild(teamCard);
        });

        // Add "Create New Team" option
        const newTeamCard = document.createElement('div');
        newTeamCard.className = 'team-card edit-mode';
        newTeamCard.innerHTML = `
            <div class="team-header">
                <h3>+ Create New Team</h3>
            </div>
            <div class="drop-zone" data-team-index="${this.currentTeams.length}"></div>
        `;
        container.appendChild(newTeamCard);
    }

    renderEditablePairs(container) {
        this.currentTeams.forEach((pair, pairIndex) => {
            const pairCard = this.createEditableTeamCard(pair, pairIndex, 'Pair');
            container.appendChild(pairCard);
        });

        // Add "Create New Pair" option
        const newPairCard = document.createElement('div');
        newPairCard.className = 'pair-card edit-mode';
        newPairCard.innerHTML = `
            <div class="team-header">
                <h3>+ Create New Pair</h3>
            </div>
            <div class="drop-zone" data-team-index="${this.currentTeams.length}"></div>
        `;
        container.appendChild(newPairCard);
    }

    renderEditableTwoTeams(container) {
        this.currentTeams.forEach((team, teamIndex) => {
            const teamCard = this.createEditableTeamCard(team, teamIndex, `Team ${teamIndex + 1}`);
            container.appendChild(teamCard);
        });
    }

    createEditableTeamCard(team, teamIndex, teamLabel) {
        const teamCard = document.createElement('div');
        teamCard.className = this.toolType.includes('pairs') ? 'pair-card edit-mode' : 'team-card edit-mode';

        const stats = this.calculateTeamStats(team);
        const maxSize = this.getMaxTeamSize();
        const minSize = this.getMinTeamSize();

        teamCard.innerHTML = `
            <div class="team-header">
                <h3>${teamLabel} ${teamIndex + 1}</h3>
                <div class="team-stats">
                    <span>Size: ${team.length}${maxSize ? `/${maxSize}` : ''}</span>
                    <span class="balance-indicator">
                        ${stats.males > 0 ? `<span class="balance-dot male"></span> ${stats.males}M` : ''}
                        ${stats.females > 0 ? `<span class="balance-dot female"></span> ${stats.females}F` : ''}
                    </span>
                    <span>Avg: ${stats.averageScore}</span>
                </div>
            </div>
            <div class="team-members" data-team-index="${teamIndex}">
                ${team.map((student, studentIndex) => this.createEditableStudentElement(student, teamIndex, studentIndex)).join('')}
                <div class="drop-zone" data-team-index="${teamIndex}"></div>
            </div>
            <div class="team-actions">
                ${team.length > 0 ? `<button class="btn btn-secondary btn-small dissolve-team" data-team-index="${teamIndex}">Dissolve Team</button>` : ''}
                ${team.length < minSize ? `<div class="team-size-error">Team too small (min: ${minSize})</div>` : ''}
                ${team.length > maxSize ? `<div class="team-size-warning">Team too large (max: ${maxSize})</div>` : ''}
            </div>
        `;

        return teamCard;
    }

    createEditableStudentElement(student, teamIndex, studentIndex) {
        // Create a unique identifier for this student to prevent data corruption
        const studentData = JSON.stringify(student).replace(/"/g, '&quot;');

        return `
            <div class="team-member draggable"
                 draggable="true"
                 data-student='${studentData}'
                 data-team-index="${teamIndex}"
                 data-student-index="${studentIndex}">
                <div class="member-info">
                    <div class="member-name">${student.name}</div>
                    <div class="member-details">Score: ${student.score} | ${student.sex === 'M' ? 'Male' : 'Female'}</div>
                </div>
                <button class="btn btn-secondary btn-small remove-student" data-team-index="${teamIndex}" data-student-index="${studentIndex}">×</button>
            </div>
        `;
    }

    setupDragAndDrop() {
        // Remove existing listeners first
        this.removeDragAndDropListeners();

        // (Re)attach draggable="true" to all .draggable/.unassigned-student nodes
        // because removeDragAndDropListeners strips out draggable=""
        document.querySelectorAll('.draggable, .unassigned-student').forEach(el => {
            el.setAttribute('draggable', 'true');
        });

        // Setup dragstart / dragend listeners on every draggable item
        this.setupDragListeners();

        // Setup drop listeners only on actual drop-zones,
        // not on their parent containers. This avoids confusion about dataset.teamIndex.
        this.setupDropListeners();

        // Click delegation for remove / dissolve buttons
        this.setupClickDelegation();
    }

    setupDragListeners() {
        this.boundEventHandlers.dragStart = this.handleDragStart.bind(this);
        this.boundEventHandlers.dragEnd = this.handleDragEnd.bind(this);

        const draggableElements = document.querySelectorAll('.draggable, .unassigned-student');
        draggableElements.forEach(element => {
            element.addEventListener('dragstart', this.boundEventHandlers.dragStart);
            element.addEventListener('dragend', this.boundEventHandlers.dragEnd);
        });
    }

    setupDropListeners() {
        this.boundEventHandlers.dragOver = this.handleDragOver.bind(this);
        this.boundEventHandlers.dragLeave = this.handleDragLeave.bind(this);
        this.boundEventHandlers.drop = this.handleDrop.bind(this);

        // **Only attach to .drop-zone**, since those always have data-team-index
        const dropZones = document.querySelectorAll('.drop-zone');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', this.boundEventHandlers.dragOver);
            zone.addEventListener('dragleave', this.boundEventHandlers.dragLeave);
            zone.addEventListener('drop', this.boundEventHandlers.drop);
        });
    }

    setupClickDelegation() {
        // Remove existing click delegation if it exists
        if (this.boundEventHandlers.clickHandler) {
            document.removeEventListener('click', this.boundEventHandlers.clickHandler);
        }

        this.boundEventHandlers.clickHandler = (e) => {
            // Handle remove student button clicks
            if (e.target.classList.contains('remove-student')) {
                e.preventDefault();
                e.stopPropagation();
                const teamIndex = parseInt(e.target.dataset.teamIndex, 10);
                const studentIndex = parseInt(e.target.dataset.studentIndex, 10);
                this.removeStudentFromTeam(teamIndex, studentIndex);
                return;
            }

            // Handle dissolve team button clicks
            if (e.target.classList.contains('dissolve-team')) {
                e.preventDefault();
                e.stopPropagation();
                const teamIndex = parseInt(e.target.dataset.teamIndex, 10);
                this.dissolveTeam(teamIndex);
                return;
            }
        };

        document.addEventListener('click', this.boundEventHandlers.clickHandler);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('active');
    }

    handleDragLeave(e) {
        // Only remove "active" if we truly left that drop-zone
        if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('active');
        }
    }

    handleDragStart(e) {
        e.target.classList.add('dragging');

        if (e.target.classList.contains('unassigned-student')) {
            this.draggedStudent = {
                student: JSON.parse(e.target.dataset.student),
                source: 'unassigned',
                sourceIndex: parseInt(e.target.dataset.index, 10)
            };
        } else {
            this.draggedStudent = {
                student: JSON.parse(e.target.dataset.student),
                source: 'team',
                teamIndex: parseInt(e.target.dataset.teamIndex, 10),
                studentIndex: parseInt(e.target.dataset.studentIndex, 10)
            };
        }

        e.dataTransfer.effectAllowed = 'move';
        // We don’t actually need to use dataTransfer.getData on drop because
        // we’ve already stored everything in this.draggedStudent
        e.dataTransfer.setData('text/plain', 'dragging-student');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('active');
        });
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('active');

        // Make sure we do have something we started dragging
        if (!this.draggedStudent) {
            return;
        }

        // The only guaranteed place with a valid teamIndex is the .drop-zone itself
        const zone = e.currentTarget;
        const teamIndexStr = zone.dataset.teamIndex;
        const teamIndex = parseInt(teamIndexStr, 10);

        if (isNaN(teamIndex)) {
            console.log('Invalid drop target (no data-team-index).');
            return;
        }

        // If dropping onto the same team (and source was a team), ignore
        if (this.draggedStudent.source === 'team' &&
            this.draggedStudent.teamIndex === teamIndex) {
            return;
        }

        // Check if we can actually add to that team
        if (!this.canAddToTeam(teamIndex)) {
            this.showMessage('Team is full!', 'error');
            return;
        }

        // Perform the move
        this.moveStudentToTeam(this.draggedStudent, teamIndex);

        // Re-render everything (which re‐initializes drop‐zones, draggable nodes, listeners, etc.)
        this.renderEditableTeams();
        this.draggedStudent = null;
    }

    moveStudentToTeam(draggedStudent, targetTeamIndex) {
        const student = { ...draggedStudent.student };

        // Remove from source
        if (draggedStudent.source === 'team') {
            if (this.currentTeams[draggedStudent.teamIndex] &&
                this.currentTeams[draggedStudent.teamIndex][draggedStudent.studentIndex]) {
                this.currentTeams[draggedStudent.teamIndex].splice(draggedStudent.studentIndex, 1);
            }
        } else if (draggedStudent.source === 'unassigned') {
            if (this.unassignedStudents[draggedStudent.sourceIndex]) {
                this.unassignedStudents.splice(draggedStudent.sourceIndex, 1);
            }
        }

        // Add to target team (create new team if needed)
        while (this.currentTeams.length <= targetTeamIndex) {
            this.currentTeams.push([]);
        }
        this.currentTeams[targetTeamIndex].push(student);

        // Clean up empty teams once we exceed original count
        const originalCount = this.originalTeams.length;
        this.currentTeams = this.currentTeams.filter((team, idx) =>
            team.length > 0 || idx < originalCount || idx === this.currentTeams.length - 1
        );

        this.showMessage(`Moved ${student.name} successfully!`, 'success');
    }

    removeStudentFromTeam(teamIndex, studentIndex) {
        if (!this.currentTeams[teamIndex] || !this.currentTeams[teamIndex][studentIndex]) {
            this.showMessage('Student not found!', 'error');
            return;
        }

        const student = { ...this.currentTeams[teamIndex][studentIndex] };
        this.currentTeams[teamIndex].splice(studentIndex, 1);
        this.unassignedStudents.push(student);

        this.renderEditableTeams();
        this.showMessage(`${student.name} moved to unassigned`, 'info');
    }

    dissolveTeam(teamIndex) {
        if (!this.currentTeams[teamIndex]) {
            this.showMessage('Team not found!', 'error');
            return;
        }

        const team = [...this.currentTeams[teamIndex]];
        this.unassignedStudents.push(...team);
        this.currentTeams.splice(teamIndex, 1);

        this.renderEditableTeams();
        this.showMessage('Team dissolved', 'info');
    }

    setupEditControls() {
        if (this.boundEventHandlers.editControlsSetup) return;
        this.boundEventHandlers.editControlsSetup = true;

        document.getElementById('saveEditsBtn').addEventListener('click', () => this.saveChanges());
        document.getElementById('cancelEditsBtn').addEventListener('click', () => this.cancelChanges());
        document.getElementById('resetTeamsBtn').addEventListener('click', () => this.resetToOriginal());
        document.getElementById('autoBalanceBtn').addEventListener('click', () => this.autoBalance());
    }

    saveChanges() {
        const validation = this.validateTeams();
        if (!validation.valid) {
            this.showMessage(validation.message, 'error');
            return;
        }

        this.app.currentResults = [...this.currentTeams];
        this.cleanupEditInterface();
        this.app.renderResults(this.currentTeams, this.toolType);
        this.showMessage('Changes saved successfully!', 'success');
        this.isEditMode = false;
    }

    cancelChanges() {
        this.cleanupEditInterface();
        this.app.renderResults(this.originalTeams, this.toolType);
        this.isEditMode = false;
        this.showMessage('Changes cancelled', 'info');
    }

    resetToOriginal() {
        this.currentTeams = JSON.parse(JSON.stringify(this.originalTeams));
        this.unassignedStudents = [];
        this.renderEditableTeams();
        this.showMessage('Reset to original teams', 'info');
    }

    autoBalance() {
        try {
            if (this.toolType.includes('heterogeneous')) {
                this.autoBalanceHeterogeneous();
            } else if (this.toolType.includes('mixed-sex')) {
                this.autoBalanceMixedSex();
            } else if (this.toolType.includes('mixed-ability')) {
                this.autoBalanceMixedAbility();
            } else {
                this.autoBalanceGeneral();
            }
            this.renderEditableTeams();
            this.showMessage('Teams auto-balanced!', 'success');
        } catch (error) {
            this.showMessage('Error auto-balancing: ' + error.message, 'error');
        }
    }

    autoBalanceHeterogeneous() {
        const allStudents = [];
        this.currentTeams.forEach(t => allStudents.push(...t));
        allStudents.push(...this.unassignedStudents);
        this.currentTeams = TeamFormation.createHeterogeneousTeams(allStudents);
        this.unassignedStudents = [];
    }

    autoBalanceMixedSex() {
        const allStudents = [];
        this.currentTeams.forEach(t => allStudents.push(...t));
        allStudents.push(...this.unassignedStudents);
        if (this.toolType.includes('pairs')) {
            this.currentTeams = TeamFormation.createMixedSexPairs(allStudents);
        } else {
            this.currentTeams = TeamFormation.createMixedSexTeams(allStudents);
        }
        this.unassignedStudents = [];
    }

    autoBalanceMixedAbility() {
        const allStudents = [];
        this.currentTeams.forEach(t => allStudents.push(...t));
        allStudents.push(...this.unassignedStudents);
        if (this.toolType.includes('pairs')) {
            this.currentTeams = TeamFormation.createHighLowPairs(allStudents);
        } else {
            this.currentTeams = TeamFormation.createMixedAbilityTeams(allStudents);
        }
        this.unassignedStudents = [];
    }

    autoBalanceGeneral() {
        const allStudents = [];
        this.currentTeams.forEach(t => allStudents.push(...t));
        allStudents.push(...this.unassignedStudents);
        const targetSize = this.getTargetTeamSize();
        const teamCount = Math.ceil(allStudents.length / targetSize);
        this.currentTeams = [];
        for (let i = 0; i < teamCount; i++) {
            this.currentTeams.push([]);
        }
        allStudents.forEach((student, idx) => {
            const teamIndex = idx % teamCount;
            this.currentTeams[teamIndex].push(student);
        });
        this.unassignedStudents = [];
    }

    calculateTeamStats(team) {
        if (team.length === 0) {
            return { males: 0, females: 0, averageScore: 0 };
        }
        const males = team.filter(s => s.sex === 'M').length;
        const females = team.filter(s => s.sex === 'F').length;
        const totalScore = team.reduce((sum, s) => sum + s.score, 0);
        const averageScore = Math.round(totalScore / team.length);
        return { males, females, averageScore };
    }

    getMaxTeamSize() {
        if (this.toolType.includes('pairs')) return 2;
        if (this.toolType.includes('two-teams')) return undefined; // No max
        return 5;
    }

    getMinTeamSize() {
        if (this.toolType.includes('pairs')) return 2;
        return 1;
    }

    getTargetTeamSize() {
        if (this.toolType.includes('pairs')) return 2;
        return 4;
    }

    canAddToTeam(teamIndex) {
        if (teamIndex >= this.currentTeams.length) return true;
        const maxSize = this.getMaxTeamSize();
        if (!maxSize) return true;
        return this.currentTeams[teamIndex].length < maxSize;
    }

    validateTeams() {
        const minSize = this.getMinTeamSize();
        for (let i = 0; i < this.currentTeams.length; i++) {
            const team = this.currentTeams[i];
            if (team.length > 0 && team.length < minSize) {
                return {
                    valid: false,
                    message: `Team ${i + 1} has only ${team.length} student(s). Minimum is ${minSize}.`
                };
            }
        }
        if (this.unassignedStudents.length > 0) {
            return {
                valid: false,
                message: `${this.unassignedStudents.length} student(s) are unassigned. Please assign all students to teams.`
            };
        }
        return { valid: true };
    }

    updateUnassignedList() {
        const unassignedList = document.getElementById('unassignedList');
        if (this.unassignedStudents.length === 0) {
            unassignedList.innerHTML = '<p>All students are assigned to teams</p>';
            return;
        }
        unassignedList.innerHTML = this.unassignedStudents.map((student, index) => {
            const studentData = JSON.stringify(student).replace(/"/g, '&quot;');
            return `
                <div class="unassigned-student"
                     draggable="true"
                     data-student='${studentData}'
                     data-index="${index}">
                    ${student.name} (${student.score}, ${student.sex === 'M' ? 'Male' : 'Female'})
                </div>
            `;
        }).join('');
    }

    cleanupEditInterface() {
        const editControls = document.querySelector('.edit-controls');
        if (editControls) editControls.remove();
        const unassignedArea = document.querySelector('.unassigned-students');
        if (unassignedArea) unassignedArea.remove();
        this.removeDragAndDropListeners();
    }

    removeDragAndDropListeners() {
        // Remove click delegation
        if (this.boundEventHandlers.clickHandler) {
            document.removeEventListener('click', this.boundEventHandlers.clickHandler);
            this.boundEventHandlers.clickHandler = null;
        }

        // Remove drag listeners
        document.querySelectorAll('.draggable, .unassigned-student').forEach(el => {
            el.removeAttribute('draggable');
            if (this.boundEventHandlers.dragStart) {
                el.removeEventListener('dragstart', this.boundEventHandlers.dragStart);
            }
            if (this.boundEventHandlers.dragEnd) {
                el.removeEventListener('dragend', this.boundEventHandlers.dragEnd);
            }
        });

        // Remove drop listeners (only from .drop-zone now)
        document.querySelectorAll('.drop-zone').forEach(zone => {
            if (this.boundEventHandlers.dragOver) {
                zone.removeEventListener('dragover', this.boundEventHandlers.dragOver);
            }
            if (this.boundEventHandlers.dragLeave) {
                zone.removeEventListener('dragleave', this.boundEventHandlers.dragLeave);
            }
            if (this.boundEventHandlers.drop) {
                zone.removeEventListener('drop', this.boundEventHandlers.drop);
            }
        });

        // Clear bound handlers
        this.boundEventHandlers.dragStart = null;
        this.boundEventHandlers.dragEnd = null;
        this.boundEventHandlers.dragOver = null;
        this.boundEventHandlers.dragLeave = null;
        this.boundEventHandlers.drop = null;
        this.boundEventHandlers.editControlsSetup = false;
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        switch (type) {
            case 'success':
                messageDiv.style.background = '#28a745';
                break;
            case 'error':
                messageDiv.style.background = '#dc3545';
                break;
            case 'warning':
                messageDiv.style.background = '#ffc107';
                messageDiv.style.color = '#212529';
                break;
            default:
                messageDiv.style.background = '#17a2b8';
        }
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to   { transform: translateX(0);   opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            messageDiv.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                messageDiv.remove();
                style.remove();
            }, 300);
        }, 3000);
    }
}
