class TeamFormation {
    static createHeterogeneousTeams(students) {
        // Creates mixed sex and mixed ability teams as described in manual
        if (students.length < 2) {
            return [students];
        }

        // Sort students by score (highest to lowest)
        const sortedStudents = [...students].sort((a, b) => b.score - a.score);
        
        // Calculate how many complete teams of 4 we can make
        const completeTeams = Math.floor(students.length / 4);
        
        if (completeTeams === 0) {
            return [students];
        }

        // Create ability groups for the students that will form complete teams
        const studentsForCompleteTeams = sortedStudents.slice(0, completeTeams * 4);
        const extraStudents = sortedStudents.slice(completeTeams * 4);
        
        // Create 4 ability groups from students that will form complete teams
        const groups = this.createAbilityGroups(studentsForCompleteTeams);
        
        // Separate by gender within each group
        const maleGroups = groups.map(group => group.filter(s => s.sex === 'M'));
        const femaleGroups = groups.map(group => group.filter(s => s.sex === 'F'));
        
        const teams = [];
        
        // Form complete teams with mixed ability and gender
        for (let i = 0; i < completeTeams; i++) {
            const team = [];
            
            // Add one from each ability group, alternating gender when possible
            for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
                const males = maleGroups[groupIndex];
                const females = femaleGroups[groupIndex];
                
                // Try to balance gender - aim for 2 males and 2 females per team
                const currentMales = team.filter(s => s.sex === 'M').length;
                const currentFemales = team.filter(s => s.sex === 'F').length;
                
                if (currentMales < 2 && males.length > 0) {
                    team.push(males.shift());
                } else if (currentFemales < 2 && females.length > 0) {
                    team.push(females.shift());
                } else if (males.length > 0) {
                    team.push(males.shift());
                } else if (females.length > 0) {
                    team.push(females.shift());
                }
            }
            
            if (team.length > 0) {
                teams.push(team);
            }
        }
        
        // Simply add extra students as a new team if any exist
        if (extraStudents.length > 0) {
            teams.push(extraStudents);
        }
        
        return teams;
    }

    static createRandomTeams(students) {
        const shuffled = this.shuffleArray([...students]);
        return this.createTeamsOfSize(shuffled, 4);
    }

    static createMixedAbilityTeams(students) {
        const sortedStudents = [...students].sort((a, b) => b.score - a.score);
        
        // Calculate how many complete teams we can make
        const completeTeams = Math.floor(students.length / 4);
        
        if (completeTeams === 0) {
            return [students];
        }

        // Take only students for complete teams
        const studentsForCompleteTeams = sortedStudents.slice(0, completeTeams * 4);
        const extraStudents = sortedStudents.slice(completeTeams * 4);
        
        const groups = this.createAbilityGroups(studentsForCompleteTeams);
        const teams = [];
        
        for (let i = 0; i < completeTeams; i++) {
            const team = [];
            groups.forEach(group => {
                if (group.length > 0) {
                    team.push(group.shift());
                }
            });
            if (team.length > 0) {
                teams.push(team);
            }
        }
        
        // Simply add extra students as a new team if any exist
        if (extraStudents.length > 0) {
            teams.push(extraStudents);
        }
        
        return teams;
    }

    static createSimilarAbilityTeams(students) {
        const sortedStudents = [...students].sort((a, b) => b.score - a.score);
        return this.createTeamsOfSize(sortedStudents, 4);
    }

    static createSameSexTeams(students) {
        const males = students.filter(s => s.sex === 'M');
        const females = students.filter(s => s.sex === 'F');
        
        const maleTeams = this.createTeamsOfSize(males, 4);
        const femaleTeams = this.createTeamsOfSize(females, 4);
        
        return [...maleTeams, ...femaleTeams];
    }

    static createMixedSexTeams(students) {
        const males = this.shuffleArray(students.filter(s => s.sex === 'M'));
        const females = this.shuffleArray(students.filter(s => s.sex === 'F'));
        const teams = [];
        
        // Calculate how many complete mixed teams we can make
        const maxMixedTeams = Math.min(Math.floor(males.length / 2), Math.floor(females.length / 2));
        
        // Create teams with 2 males and 2 females
        for (let i = 0; i < maxMixedTeams; i++) {
            const team = [
                males.pop(),
                males.pop(),
                females.pop(),
                females.pop()
            ];
            teams.push(team);
        }
        
        // Handle remaining students
        const remaining = [...males, ...females];
        if (remaining.length > 0) {
            teams.push(remaining);
        }
        
        return teams;
    }

    // Pair Formation Methods
    static createHighLowPairs(students) {
        const sortedStudents = [...students].sort((a, b) => b.score - a.score);
        const pairs = [];
        
        while (sortedStudents.length >= 2) {
            const high = sortedStudents.shift(); // Highest remaining
            const low = sortedStudents.pop();   // Lowest remaining
            pairs.push([high, low]);
        }
        
        // Handle odd student
        if (sortedStudents.length === 1) {
            if (pairs.length > 0) {
                pairs[0].push(sortedStudents[0]);
            } else {
                pairs.push([sortedStudents[0]]);
            }
        }
        
        return pairs;
    }

    static createHighMediumPairs(students) {
        const sortedStudents = [...students].sort((a, b) => b.score - a.score);
        const pairs = [];
        const half = Math.floor(sortedStudents.length / 2);
        
        const highHalf = sortedStudents.slice(0, half);
        const lowHalf = sortedStudents.slice(half);
        
        for (let i = 0; i < Math.min(highHalf.length, lowHalf.length); i++) {
            pairs.push([highHalf[i], lowHalf[i]]);
        }
        
        // Handle remaining students
        const remaining = highHalf.slice(lowHalf.length).concat(lowHalf.slice(highHalf.length));
        if (remaining.length > 0) {
            if (pairs.length > 0 && remaining.length === 1) {
                pairs[0].push(remaining[0]);
            } else {
                for (let i = 0; i < remaining.length; i += 2) {
                    if (i + 1 < remaining.length) {
                        pairs.push([remaining[i], remaining[i + 1]]);
                    } else {
                        pairs.push([remaining[i]]);
                    }
                }
            }
        }
        
        return pairs;
    }

    static createRandomPairs(students) {
        const shuffled = this.shuffleArray([...students]);
        const pairs = [];
        
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                pairs.push([shuffled[i], shuffled[i + 1]]);
            } else {
                pairs.push([shuffled[i]]);
            }
        }
        
        return pairs;
    }

    static createSimilarAbilityPairs(students) {
        const sortedStudents = [...students].sort((a, b) => b.score - a.score);
        const pairs = [];
        
        for (let i = 0; i < sortedStudents.length; i += 2) {
            if (i + 1 < sortedStudents.length) {
                pairs.push([sortedStudents[i], sortedStudents[i + 1]]);
            } else {
                pairs.push([sortedStudents[i]]);
            }
        }
        
        return pairs;
    }

    static createSameSexPairs(students) {
        const males = this.shuffleArray(students.filter(s => s.sex === 'M'));
        const females = this.shuffleArray(students.filter(s => s.sex === 'F'));
        const pairs = [];
        
        // Create male pairs
        for (let i = 0; i < males.length; i += 2) {
            if (i + 1 < males.length) {
                pairs.push([males[i], males[i + 1]]);
            } else {
                pairs.push([males[i]]);
            }
        }
        
        // Create female pairs
        for (let i = 0; i < females.length; i += 2) {
            if (i + 1 < females.length) {
                pairs.push([females[i], females[i + 1]]);
            } else {
                pairs.push([females[i]]);
            }
        }
        
        return pairs;
    }

    static createMixedSexPairs(students) {
        const males = this.shuffleArray(students.filter(s => s.sex === 'M'));
        const females = this.shuffleArray(students.filter(s => s.sex === 'F'));
        const pairs = [];
        
        // Create mixed pairs
        while (males.length > 0 && females.length > 0) {
            pairs.push([males.pop(), females.pop()]);
        }
        
        // Handle remaining same-sex students
        const remaining = [...males, ...females];
        for (let i = 0; i < remaining.length; i += 2) {
            if (i + 1 < remaining.length) {
                pairs.push([remaining[i], remaining[i + 1]]);
            } else {
                pairs.push([remaining[i]]);
            }
        }
        
        return pairs;
    }

    // Two Teams Methods
    static createRandomTwoTeams(students) {
        const shuffled = this.shuffleArray([...students]);
        const half = Math.ceil(shuffled.length / 2);
        
        const team1 = shuffled.slice(0, half);
        const team2 = shuffled.slice(half);
        
        return [team1, team2];
    }

    static createBalancedTwoTeams(students) {
        // Balance by gender and ability
        const males = students.filter(s => s.sex === 'M').sort((a, b) => b.score - a.score);
        const females = students.filter(s => s.sex === 'F').sort((a, b) => b.score - a.score);
        
        const team1 = [];
        const team2 = [];
        
        // Distribute males
        males.forEach((male, index) => {
            if (index % 2 === 0) {
                team1.push(male);
            } else {
                team2.push(male);
            }
        });
        
        // Distribute females
        females.forEach((female, index) => {
            if (index % 2 === 0) {
                team1.push(female);
            } else {
                team2.push(female);
            }
        });
        
        return [team1, team2];
    }

    // Helper Methods
    static createAbilityGroups(sortedStudents) {
        const total = sortedStudents.length;
        const groupSize = Math.floor(total / 4);
        const remainder = total % 4;
        
        const groups = [
            [], // High
            [], // High-Medium  
            [], // Low-Medium
            []  // Low
        ];
        
        let index = 0;
        for (let i = 0; i < 4; i++) {
            const size = groupSize + (i < remainder ? 1 : 0);
            groups[i] = sortedStudents.slice(index, index + size);
            index += size;
        }
        
        return groups;
    }

    static createTeamsOfSize(students, size) {
        const teams = [];
        const studentsCopy = [...students];
        
        while (studentsCopy.length >= size) {
            teams.push(studentsCopy.splice(0, size));
        }
        
        // Simply add remaining students as a team if any exist
        if (studentsCopy.length > 0) {
            teams.push(studentsCopy);
        }
        
        return teams;
    }

    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}