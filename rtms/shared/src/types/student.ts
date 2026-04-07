export interface IStudent {
  _id: string;
  name: string;
  course: string;
  yearLevel: number;
  createdAt: Date;
}

export interface CreateStudentDTO {
  name: string;
  course: string;
  yearLevel: number;
}
