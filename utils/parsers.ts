import Papa from 'papaparse';

export const parseCSV = (file: File): Promise<{ data: any[], columns: string[] }> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          resolve({
            data: results.data,
            columns: results.meta.fields
          });
        } else {
          reject(new Error("Could not parse columns from CSV"));
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const loadExampleTitanic = async (): Promise<{ data: any[], columns: string[] }> => {
    // A small subset of Titanic data for demo purposes if file load fails or for defaults
    const rawData = `PassengerId,Survived,Pclass,Name,Sex,Age,SibSp,Parch,Ticket,Fare,Cabin,Embarked
1,0,3,"Braund, Mr. Owen Harris",male,22,1,0,A/5 21171,7.25,,S
2,1,1,"Cumings, Mrs. John Bradley (Florence Briggs Thayer)",female,38,1,0,PC 17599,71.2833,C85,C
3,1,3,"Heikkinen, Miss. Laina",female,26,0,0,STON/O2. 3101282,7.925,,S
4,1,1,"Futrelle, Mrs. Jacques Heath (Lily May Peel)",female,35,1,0,113803,53.1,C123,S
5,0,3,"Allen, Mr. William Henry",male,35,0,0,373450,8.05,,S
6,0,3,"Moran, Mr. James",male,,0,0,330877,8.4583,,Q`;

    return new Promise((resolve, reject) => {
        Papa.parse(rawData, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.meta.fields) {
                    resolve({
                        data: results.data,
                        columns: results.meta.fields
                    });
                } else {
                    reject(new Error("Could not parse columns from CSV"));
                }
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};