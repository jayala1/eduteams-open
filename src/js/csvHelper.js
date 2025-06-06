class CSVHelper {
    static parseCSVInput(input) {
        // Parse CSV input in format: Student1,Score1,Sex1,Student2,Score2,Sex2
        const values = input.split(',').map(v => v.trim());
        const students = [];
        
        if (values.length % 3 !== 0) {
            throw new Error('CSV data must be in format: Name,Score,Gender,Name,Score,Gender...');
        }
        
        for (let i = 0; i < values.length; i += 3) {
            const name = values[i];
            const score = parseInt(values[i + 1]);
            const sex = values[i + 2].toUpperCase();
            
            if (!name || name.length === 0) {
                throw new Error(`Student name cannot be empty at position ${i + 1}`);
            }
            
            if (isNaN(score) || score < 0 || score > 100) {
                throw new Error(`Invalid score "${values[i + 1]}" for student "${name}". Score must be 0-100.`);
            }
            
            if (sex !== 'M' && sex !== 'F') {
                throw new Error(`Invalid gender "${values[i + 2]}" for student "${name}". Use M or F.`);
            }
            
            students.push({ name, score, sex });
        }
        
        return students;
    }

    static parseCSVFile(csvData) {
        const lines = csvData.trim().split('\n');
        const students = [];
        
        // Skip header if it exists
        let startIndex = 0;
        if (lines.length > 0) {
            const firstLine = lines[0].toLowerCase();
            if (firstLine.includes('name') && (firstLine.includes('score') || firstLine.includes('grade'))) {
                startIndex = 1;
            }
        }
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length === 0) continue;
            
            const values = this.parseCSVLine(line);
            
            if (values.length < 3) {
                throw new Error(`Line ${i + 1}: Not enough values. Expected Name,Score,Gender`);
            }
            
            const name = values[0].trim();
            const scoreStr = values[1].trim();
            const sexStr = values[2].trim().toUpperCase();
            
            if (!name || name.length === 0) {
                throw new Error(`Line ${i + 1}: Student name cannot be empty`);
            }
            
            const score = parseInt(scoreStr);
            if (isNaN(score) || score < 0 || score > 100) {
                throw new Error(`Line ${i + 1}: Invalid score "${scoreStr}" for student "${name}". Score must be 0-100.`);
            }
            
            if (sexStr !== 'M' && sexStr !== 'F') {
                throw new Error(`Line ${i + 1}: Invalid gender "${sexStr}" for student "${name}". Use M or F.`);
            }
            
            students.push({ name, score, sex: sexStr });
        }
        
        if (students.length === 0) {
            throw new Error('No valid student data found in CSV');
        }
        
        return students;
    }

    static parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values;
    }

    static generateCSVTemplate(studentCount = 20) {
        const names = [
            'John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Wilson',
            'David Brown', 'Emily Davis', 'Chris Miller', 'Ashley Garcia',
            'Matthew Rodriguez', 'Jessica Martinez', 'Daniel Anderson',
            'Amanda Taylor', 'Andrew Thomas', 'Melissa Jackson', 'Joshua White',
            'Stephanie Harris', 'Ryan Clark', 'Nicole Lewis', 'Brandon Lee',
            'Samantha Walker'
        ];
        
        let csv = 'Name,Score,Gender\n';
        
        for (let i = 0; i < Math.min(studentCount, names.length); i++) {
            const name = names[i];
            const score = Math.floor(Math.random() * 41) + 60; // Random score 60-100
            const gender = i % 2 === 0 ? 'M' : 'F';
            csv += `"${name}",${score},${gender}\n`;
        }
        
        return csv;
    }

    static exportStudentsToCSV(students) {
        let csv = 'Name,Score,Gender\n';
        students.forEach(student => {
            csv += `"${student.name}",${student.score},${student.sex}\n`;
        });
        return csv;
    }

    static validateCSVFormat(csvData) {
        try {
            this.parseCSVFile(csvData);
            return { valid: true, message: 'CSV format is valid' };
        } catch (error) {
            return { valid: false, message: error.message };
        }
    }

    static convertToTeamToolsFormat(students) {
        // Convert to format expected by TeamTools: Student1,Score1,Sex1,Student2,Score2,Sex2
        const values = [];
        students.forEach(student => {
            values.push(student.name, student.score.toString(), student.sex);
        });
        return values.join(',');
    }

    static suggestCorrections(csvData) {
        const lines = csvData.trim().split('\n');
        const suggestions = [];
        
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            const values = this.parseCSVLine(line);
            
            if (values.length > 0) {
                // Check for common issues
                if (values.length < 3) {
                    suggestions.push(`Line ${lineNum}: Missing data. Expected Name,Score,Gender`);
                }
                
                if (values.length >= 2) {
                    const scoreStr = values[1].trim();
                    const score = parseFloat(scoreStr);
                    
                    if (isNaN(score)) {
                        suggestions.push(`Line ${lineNum}: "${scoreStr}" is not a valid number`);
                    } else if (score < 0 || score > 100) {
                        suggestions.push(`Line ${lineNum}: Score ${score} should be between 0 and 100`);
                    }
                }
                
                if (values.length >= 3) {
                    const sex = values[2].trim().toUpperCase();
                    if (sex !== 'M' && sex !== 'F' && sex !== 'MALE' && sex !== 'FEMALE') {
                        suggestions.push(`Line ${lineNum}: Gender "${values[2]}" should be M, F, Male, or Female`);
                    }
                }
            }
        });
        
        return suggestions;
    }

    static cleanCSVData(csvData) {
        const lines = csvData.trim().split('\n');
        const cleanedLines = [];
        
        lines.forEach(line => {
            const values = this.parseCSVLine(line);
            if (values.length >= 3) {
                const name = values[0].trim();
                const score = values[1].trim();
                const sex = values[2].trim().toUpperCase();
                
                // Convert gender variations
                let cleanSex = sex;
                if (sex === 'MALE') cleanSex = 'M';
                if (sex === 'FEMALE') cleanSex = 'F';
                
                cleanedLines.push(`"${name}",${score},${cleanSex}`);
            }
        });
        
        return cleanedLines.join('\n');
    }
}