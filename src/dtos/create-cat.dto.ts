export class CreateCatDto {
  name: string;
  age: number;
  breed: string;
}

export class UpdateCatDto {
  name: string;
  age: number;
  breed: string;
}

export class ListAllEntities {
  name: string;
  age: number;
  breed: string;
  limit: any;
}

export interface Cat {
  name: string;
  age: number;
  breed: string;
}
