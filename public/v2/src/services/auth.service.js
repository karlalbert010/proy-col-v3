import { api } from './api.js';
export async function login(username,password){
  const out=await api('/auth/login',{method:'POST',body:{username,password}});
  const token=typeof out?.data?.token==='string'?out.data.token:out?.data?.token?.token;
  const user=out?.data?.token?.user||null;
  return { token,user,raw:out };
}
