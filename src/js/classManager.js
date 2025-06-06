class ClassManager {
    constructor() {
        this.classes = {};
        this.currentClass = null;
    }

    createClass(name) {
        if (!name || typeof name !== 'string') {
            throw new Error('Class name must be a non-empty string');
        }

        const className = name.trim();
        if (className.length === 0) {
            throw new Error('Class name cannot be empty');
        }

        this.classes[className] = {
            name: className,
            students: [],
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        return this.classes[className];
    }

    addClass(className, classData) {
        this.classes[className] = {
            ...classData,
            lastModified: new Date().toISOString()
        };
    }

    getClass(name) {
        return this.classes[name] || null;
    }

    getAllClasses() {
        return this.classes;
    }

    deleteClass(name) {
        if (this.classes[name]) {
            delete this.classes[name];
            if (this.currentClass === name) {
                this.currentClass = null;
            }
            return true;
        }
        return false;
    }

    setCurrentClass(name) {
        if (this.classes[name]) {
            this.currentClass = name;
            return true;
        }
        return false;
    }

    getCurrentClass() {
        return this.currentClass ? this.classes[this.currentClass] : null;
    }

    addStudentToClass(className, student) {
        if (!this.classes[className]) {
            throw new Error('Class not found');
        }

        if (!this.isValidStudent(student)) {
            throw new Error('Invalid student data');
        }

        this.classes[className].students.push(student);
        this.classes[className].lastModified = new Date().toISOString();
    }

    removeStudentFromClass(className, studentIndex) {
        if (!this.classes[className]) {
            throw new Error('Class not found');
        }

        if (studentIndex < 0 || studentIndex >= this.classes[className].students.length) {
            throw new Error('Invalid student index');
        }

        this.classes[className].students.splice(studentIndex, 1);
        this.classes[className].lastModified = new Date().toISOString();
    }

    updateStudent(className, studentIndex, updatedStudent) {
        if (!this.classes[className]) {
            throw new Error('Class not found');
        }

        if (studentIndex < 0 || studentIndex >= this.classes[className].students.length) {
            throw new Error('Invalid student index');
        }

        if (!this.isValidStudent(updatedStudent)) {
            throw new Error('Invalid student data');
        }

        this.classes[className].students[studentIndex] = updatedStudent;
        this.classes[className].lastModified = new Date().toISOString();
    }

    isValidStudent(student) {
        return (
            student &&
            typeof student.name === 'string' &&
            student.name.trim().length > 0 &&
            typeof student.score === 'number' &&
            student.score >= 0 &&
            student.score <= 100 &&
            (student.sex === 'M' || student.sex === 'F')
        );
    }

    getClassStats(className) {
        const classData = this.classes[className];
        if (!classData) {
            return null;
        }

        const students = classData.students;
        const totalStudents = students.length;
        
        if (totalStudents === 0) {
            return {
                totalStudents: 0,
                maleCount: 0,
                femaleCount: 0,
                averageScore: 0,
                highestScore: 0,
                lowestScore: 0
            };
        }

        const maleCount = students.filter(s => s.sex === 'M').length;
        const femaleCount = students.filter(s => s.sex === 'F').length;
        const scores = students.map(s => s.score);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalStudents;
        const highestScore = Math.max(...scores);
        const lowestScore = Math.min(...scores);

        return {
            totalStudents,
            maleCount,
            femaleCount,
            averageScore: Math.round(averageScore * 100) / 100,
            highestScore,
            lowestScore
        };
    }

    exportClassToCSV(className) {
        const classData = this.classes[className];
        if (!classData) {
            throw new Error('Class not found');
        }

        let csv = 'Name,Score,Gender\n';
        classData.students.forEach(student => {
            csv += `"${student.name}",${student.score},${student.sex}\n`;
        });

        return csv;
    }

    importClassFromCSV(className, csvData) {
        if (!this.classes[className]) {
            throw new Error('Class not found');
        }

        try {
            const students = CSVHelper.parseCSVFile(csvData);
            this.classes[className].students = students;
            this.classes[className].lastModified = new Date().toISOString();
            return students.length;
        } catch (error) {
            throw new Error('Error parsing CSV data: ' + error.message);
        }
    }

    validateClassData(classData) {
        if (!classData || typeof classData !== 'object') {
            return false;
        }

        if (!classData.name || typeof classData.name !== 'string') {
            return false;
        }

        if (!Array.isArray(classData.students)) {
            return false;
        }

        return classData.students.every(student => this.isValidStudent(student));
    }

    sortStudents(className, sortBy = 'name', ascending = true) {
        if (!this.classes[className]) {
            throw new Error('Class not found');
        }

        const students = this.classes[className].students;
        
        students.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                case 'score':
                    valueA = a.score;
                    valueB = b.score;
                    break;
                case 'sex':
                    valueA = a.sex;
                    valueB = b.sex;
                    break;
                default:
                    throw new Error('Invalid sort field');
            }

            if (valueA < valueB) return ascending ? -1 : 1;
            if (valueA > valueB) return ascending ? 1 : -1;
            return 0;
        });

        this.classes[className].lastModified = new Date().toISOString();
    }

    searchStudents(className, searchTerm) {
        if (!this.classes[className]) {
            throw new Error('Class not found');
        }

        const term = searchTerm.toLowerCase();
        return this.classes[className].students.filter(student =>
            student.name.toLowerCase().includes(term)
        );
    }

    duplicateClass(originalName, newName) {
        if (!this.classes[originalName]) {
            throw new Error('Original class not found');
        }

        if (this.classes[newName]) {
            throw new Error('Class with new name already exists');
        }

        this.classes[newName] = {
            ...JSON.parse(JSON.stringify(this.classes[originalName])),
            name: newName,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        return this.classes[newName];
    }
}