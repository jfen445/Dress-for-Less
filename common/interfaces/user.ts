export interface IUser {
  mongoID?: string;
  name: string;
  email: string;
  password?: string;
  mobileNumber: string;
  instagramHandle?: string;
  photo: string;
}

export interface ICart {
  dressId: string;
  userId: string;
  dateBooked: string;
}
