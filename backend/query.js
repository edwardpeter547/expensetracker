import { json } from "express";
import { checkExistingUser } from "./src/services/auth.service.js";
const data = await checkExistingUser('edwardpeter547@gmail.com', 'edwardpeter547')
console.log('This is the data', JSON.stringify(data));