import { store } from '../store/index.js';
const base='';
export async function api(path,{method='GET',body}={}){
  const headers={'Content-Type':'application/json'};
  const token=store.get().token;
  if(token) headers.Authorization=`Bearer ${token}`;
  const res=await fetch(`${base}${path}`,{method,headers,body:body?JSON.stringify(body):undefined});
  let data=null; try{data=await res.json()}catch{data={success:false,message:'Respuesta no JSON'}}
  if(!res.ok) throw new Error(data.message||`HTTP ${res.status}`);
  return data;
}
