const state={token:localStorage.getItem('cole_v2_token')||'',user:null,view:'dashboard'};
export const store={
  get:()=>state,
  setToken(token){state.token=token||''; if(token){localStorage.setItem('cole_v2_token',token)}else{localStorage.removeItem('cole_v2_token')}},
  setUser(user){state.user=user||null},
  setView(view){state.view=view}
};
