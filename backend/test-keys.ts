import { users } from "./src/db/schema";
console.log({
  department: !!users.department,
  displayName: !!users.displayName,
});
