import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./login";

import { saveUserProfile, useLists, createListInDB, updateListInDB, deleteListInDB, sendListInvite, useListInvites, acceptListInvite, declineListInvite, pushActivityToDB, useActivity } from "./useFirestore";
import FriendPanel, { useFriends, useFriendRequests } from "./FriendSystem";

import ProfileModal from "./ProfileModal";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { createPortal } from 'react-dom';

const portal = document.getElementById('drag-portal');
const DraggableItem = ({ provided, snapshot, children }) => {
  const child = (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={{...provided.draggableProps.style, display:'flex', alignItems:'center', gap:2}}
    >
      {children}
    </div>
  );
  if (snapshot.isDragging && portal) {
    return createPortal(child, portal);
  }
  return child;
};

const PASTEL_COLORS = ['#FFD6E0','#D6E8FF','#D6FFE4','#FFF3D6','#E8D6FF','#FFE4D6'];
const USERS = [
  { id:'way',  name:'Way',  avatar:'🌿', color:'#D6FFE4' },
  { id:'bell', name:'Bell', avatar:'🔔', color:'#FFD6E0' },
  { id:'john', name:'John', avatar:'⚡', color:'#D6E8FF' },
  { id:'alex', name:'Alex', avatar:'🌙', color:'#E8D6FF' },
];
const PRIORITIES = ['HIGH','MED','LOW'];
const P_COLOR = { HIGH:'#e05555', MED:'#c47a0a', LOW:'#2f8a55' };
const P_BG    = { HIGH:'#FFECEC', MED:'#FFF6E0', LOW:'#E4F7EC' };
const EMOJIS_LIST = ['📌','✈️','🏠','🛒','📚','💪','🎨','🎵','🍕','☕','🎯','🔑','💡','📝','🧳','🛡️','📧'];
const REACTIONS_LIST = ['👍','🔥','❤️','🎉','😂'];
const CATEGORIES = ['Travel','Shopping','Education','Work','Health','Personal','Events','Other'];

const genId = () => Math.random().toString(36).substr(2,9);
const ts    = () => new Date().toISOString();

const SAMPLE_LISTS = [
  {
    id:'list1', name:'Trip to Japan 🗾', category:'Travel', color:'#D6E8FF',
    isPrivate:false, isGroup:true, members:['way','bell','john'],
    createdBy:'way', createdAt:ts(),
    tasks:[
      { id:'t1', text:'Book flights', completed:true, completedBy:'way', completedAt:ts(),
        assignee:'way', priority:'HIGH', dueDate:'2026-03-15', emoji:'✈️',
        reactions:{'👍':['bell','john'],'🔥':['bell']},
        comments:[{id:'c1',userId:'bell',text:'Found cheap ones on Skyscanner!',createdAt:ts()}],
        createdBy:'way', createdAt:ts() },
      { id:'t2', text:'Reserve Airbnb in Tokyo', completed:false, completedBy:null, completedAt:null,
        assignee:'bell', priority:'HIGH', dueDate:'2026-03-20', emoji:'🏠',
        reactions:{'❤️':['way']}, comments:[], createdBy:'way', createdAt:ts() },
      { id:'t3', text:'Buy travel insurance', completed:false, completedBy:null, completedAt:null,
        assignee:'john', priority:'MED', dueDate:'2026-03-25', emoji:'🛡️',
        reactions:{}, comments:[], createdBy:'way', createdAt:ts() },
      { id:'t4', text:'Pack luggage', completed:false, completedBy:null, completedAt:null,
        assignee:null, priority:'LOW', dueDate:null, emoji:'🧳',
        reactions:{}, comments:[], createdBy:'bell', createdAt:ts() },
    ],
  },
  {
    id:'list2', name:'Grocery Run 🛒', category:'Shopping', color:'#D6FFE4',
    isPrivate:true, isGroup:false, members:['way'],
    createdBy:'way', createdAt:ts(),
    tasks:[
      { id:'t5', text:'Milk', completed:true, completedBy:'way', completedAt:ts(),
        assignee:'way', priority:'LOW', dueDate:null, emoji:'🥛',
        reactions:{}, comments:[], createdBy:'way', createdAt:ts() },
      { id:'t6', text:'Eggs', completed:true, completedBy:'way', completedAt:ts(),
        assignee:'way', priority:'LOW', dueDate:null, emoji:'🥚',
        reactions:{}, comments:[], createdBy:'way', createdAt:ts() },
      { id:'t7', text:'Bread', completed:false, completedBy:null, completedAt:null,
        assignee:'way', priority:'MED', dueDate:null, emoji:'🍞',
        reactions:{}, comments:[], createdBy:'way', createdAt:ts() },
    ],
  },
  {
    id:'list3', name:'Study Goals 📚', category:'Education', color:'#E8D6FF',
    isPrivate:false, isGroup:true, members:['way','alex'],
    createdBy:'alex', createdAt:ts(),
    tasks:[
      { id:'t8', text:'Submit application SOP', completed:true, completedBy:'way', completedAt:ts(),
        assignee:'way', priority:'HIGH', dueDate:'2026-03-10', emoji:'📝',
        reactions:{'🎉':['alex']}, comments:[], createdBy:'way', createdAt:ts() },
      { id:'t9', text:'Prepare portfolio PDF', completed:false, completedBy:null, completedAt:null,
        assignee:'way', priority:'HIGH', dueDate:'2026-03-12', emoji:'🎨',
        reactions:{}, comments:[], createdBy:'way', createdAt:ts() },
      { id:'t10', text:'Send recommendation letter request', completed:false, completedBy:null, completedAt:null,
        assignee:'alex', priority:'MED', dueDate:'2026-03-14', emoji:'📧',
        reactions:{}, comments:[], createdBy:'alex', createdAt:ts() },
    ],
  },
];

const SAMPLE_ACTIVITY = [
  { id:'a1', userId:'bell', action:'added',     target:'Reserve Airbnb in Tokyo', listName:'Trip to Japan 🗾', createdAt:new Date(Date.now()-15*60000).toISOString() },
  { id:'a2', userId:'way',  action:'completed', target:'Book flights',            listName:'Trip to Japan 🗾', createdAt:new Date(Date.now()-45*60000).toISOString() },
  { id:'a3', userId:'alex', action:'added',     target:'Recommendation letter',   listName:'Study Goals 📚',  createdAt:new Date(Date.now()-120*60000).toISOString() },
  { id:'a4', userId:'john', action:'reacted to',target:'Book flights',            listName:'Trip to Japan 🗾', createdAt:new Date(Date.now()-180*60000).toISOString() },
];

const getUser = (id) => USERS.find(u=>u.id===id)||USERS[0];
const timeAgo = (iso) => {
  const m=Math.floor((Date.now()-new Date(iso).getTime())/60000);
  if(m<1) return 'just now'; if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
};

const fmtDate = (ds) => {
  if(!ds) return null;
  const date = new Date(ds);
  const diff=Math.floor((date-new Date())/86400000);
  const timeStr = ds.includes('T') ? ` ${date.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}` : '';
  if(diff<0)  return {label:`Overdue${timeStr}`, urgent:true};
  if(diff===0) return {label:`Today${timeStr}`, urgent:true};
  if(diff===1) return {label:`Tomorrow${timeStr}`, urgent:false};
  return {label:`${new Date(ds).toLocaleDateString('en',{month:'short',day:'numeric'})}${timeStr}`, urgent:false};
};
const GCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,400&family=Epilogue:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;} body{margin:0;}
  @keyframes fall {
    0%  {transform:translateY(-20px) rotate(0deg);   opacity:1;}
    100%{transform:translateY(108vh) rotate(540deg); opacity:0;}
  }
  @keyframes fadeUp {from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  @keyframes shimmer {0%,100%{opacity:1}50%{opacity:.35}}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:#ccc;border-radius:2px;}
  input,select,textarea{font-family:Epilogue,sans-serif;}
`;

// ── Confetti ──────────────────────────────────────────────────────────────────
const Confetti = ({active}) => {
  if(!active) return null;
  return <>
    {Array.from({length:60},(_,i)=>(
      <div key={i} style={{
        position:'fixed',top:'-12px',left:`${Math.random()*100}vw`,
        width:`${5+Math.random()*9}px`,height:`${5+Math.random()*9}px`,
        background:PASTEL_COLORS[Math.floor(Math.random()*PASTEL_COLORS.length)],
        borderRadius:Math.random()>.5?'50%':'3px',
        animation:`fall ${1.5+Math.random()*2}s ease-in forwards`,
        animationDelay:`${Math.random()*1}s`,zIndex:9999,pointerEvents:'none',
      }}/>
    ))}
  </>;
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({userId,size=28}) => {
  const u=getUser(userId);
  return <div title={u.name} style={{width:size,height:size,borderRadius:'50%',background:u.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.44,border:'1.5px solid rgba(0,0,0,.08)',flexShrink:0}}>{u.avatar}</div>;
};

// ── Priority Badge ────────────────────────────────────────────────────────────
const PBadge = ({p}) => (
  <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,color:P_COLOR[p],background:P_BG[p],letterSpacing:'.05em',flexShrink:0,fontFamily:'Epilogue,sans-serif'}}>{p}</span>
);

// ── Progress Bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({tasks,dark}) => {
  const total=tasks.length, done=tasks.filter(t=>t.completed).length;
  const pct=total===0?0:Math.round((done/total)*100);
  const B=12, filled=Math.round((done/Math.max(total,1))*B);
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{display:'flex',gap:2}}>
        {Array.from({length:B},(_,i)=>(
          <div key={i} style={{width:14,height:7,borderRadius:2,background:i<filled?(dark?'#fafafa':'#0a0a0a'):(dark?'#2a2a2a':'#e0e0e0'),transition:'background .3s'}}/>
        ))}
      </div>
      <span style={{color:dark?'#888':'#999',fontFamily:'Epilogue,sans-serif',fontSize:12}}>{done}/{total} · {pct}%</span>
    </div>
  );
};

// ── Task Item ─────────────────────────────────────────────────────────────────
const TaskItem = ({task,currentUser,dark,onToggle,onDelete,onReact,onOpenDetail}) => {
  const [hov,setHov]=useState(false);
  const [showRx,setShowRx]=useState(false);
  const surface=dark?'#1c1c1c':'#fff', bdr=dark?'#2a2a2a':'#f0f0f0';
  const txt=dark?'#f0f0f0':'#0a0a0a', muted=dark?'#666':'#aaa';
  const di=fmtDate(task.dueDate);

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);setShowRx(false);}} style={{
      background:surface,border:`1.5px solid ${hov?(dark?'#444':'#ccc'):bdr}`,
      borderRadius:12,padding:'11px 14px',marginBottom:7,
      boxShadow:hov?`0 2px 10px rgba(0,0,0,${dark?.15:.06})`:'none',
      display:'flex',gap:10,alignItems:'flex-start',
      opacity:task.completed?.72:1,animation:'fadeUp .18s ease-out',transition:'border-color .12s,box-shadow .12s',
    }}>
      <button onClick={()=>onToggle(task.id)} style={{
        width:20,height:20,borderRadius:6,flexShrink:0,marginTop:1,cursor:'pointer',
        border:`2px solid ${task.completed?(dark?'#ddd':'#0a0a0a'):(dark?'#444':'#ccc')}`,
        background:task.completed?(dark?'#ddd':'#0a0a0a'):'transparent',
        display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',
      }}>{task.completed&&<span style={{fontSize:11,color:dark?'#111':'#fafafa',fontWeight:700}}>✓</span>}</button>

      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4}}>
          {task.emoji&&<span style={{fontSize:15}}>{task.emoji}</span>}
          <span style={{fontFamily:'Epilogue,sans-serif',fontWeight:500,fontSize:14,color:txt,textDecoration:task.completed?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:220}}>{task.text}</span>
          <PBadge p={task.priority}/>
          {di&&<span style={{fontSize:10,padding:'2px 7px',borderRadius:20,flexShrink:0,background:di.urgent?'#FF6B6B22':(dark?'#2a2a2a':'#f5f5f5'),color:di.urgent?'#FF6B6B':muted,fontFamily:'Epilogue,sans-serif'}}>{di.label}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
          {task.assignee&&!task.completed&&(
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <Avatar userId={task.assignee} size={16}/>
              <span style={{fontSize:11,color:muted,fontFamily:'Epilogue,sans-serif'}}>→ {task.assigneeName || task.assignee}</span>
            </div>
          )}
          {task.completed&&task.completedBy&&(
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <Avatar userId={task.completedBy} size={16}/>
              <span style={{fontSize:11,color:'#2f8a55',fontFamily:'Epilogue,sans-serif'}}>done by {getUser(task.completedBy).name}</span>
            </div>
          )}
          {REACTIONS_LIST.map(em=>{
            const us=task.reactions[em]||[];
            return us.length>0?(
              <button key={em} onClick={()=>onReact(task.id,em)} style={{background:us.includes(currentUser.id)?(dark?'#2a2a2a':'#f0f0f0'):'transparent',border:`1px solid ${dark?'#333':'#e8e8e8'}`,borderRadius:20,padding:'1px 8px',fontSize:12,cursor:'pointer',color:txt,display:'flex',alignItems:'center',gap:3}}>{em}<span style={{fontSize:11}}>{us.length}</span></button>
            ):null;
          })}
          {task.comments.length>0&&(
            <button onClick={()=>onOpenDetail(task)} style={{background:'none',border:'none',color:muted,fontSize:11,cursor:'pointer',padding:0}}>💬 {task.comments.length}</button>
          )}
        </div>
      </div>

      <div style={{display:'flex',gap:4,opacity:hov?1:0,transition:'opacity .12s',flexShrink:0,alignItems:'center'}}>
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowRx(!showRx)} style={{background:'none',border:`1px solid ${dark?'#333':'#e8e8e8'}`,borderRadius:7,padding:'3px 7px',cursor:'pointer',fontSize:13,color:txt}}>😊</button>
          {showRx&&(
            <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:surface,border:`1px solid ${bdr}`,borderRadius:10,padding:'6px 8px',display:'flex',gap:4,zIndex:200,boxShadow:`0 6px 20px rgba(0,0,0,${dark?.3:.1})`}}>
              {REACTIONS_LIST.map(em=>(
                <button key={em} onClick={()=>{onReact(task.id,em);setShowRx(false);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,borderRadius:6,padding:'2px 3px'}}>{em}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={()=>onOpenDetail(task)} style={{background:'none',border:`1px solid ${dark?'#333':'#e8e8e8'}`,borderRadius:7,padding:'3px 9px',cursor:'pointer',fontSize:14,color:muted}}>···</button>
        <button onClick={()=>onDelete(task.id)} style={{background:'none',border:`1px solid ${dark?'#333':'#e8e8e8'}`,borderRadius:7,padding:'3px 7px',cursor:'pointer',fontSize:14,color:'#e05555'}}>×</button>
      </div>
    </div>
  );
};

// ── Task Detail Modal ─────────────────────────────────────────────────────────
const TaskDetailModal = ({task, currentUser, dark, onClose, onUpdate, onSave, onReact, friends=[], listMembers=[]}) => {
  const [comment, setComment] = useState('');
  const [editText, setEditText] = useState(task.text);
  const [editPrio, setEditPrio] = useState(task.priority);
  const [editAssignee, setEditAssignee] = useState(task.assignee||'');
  const [editDue, setEditDue] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
  const [editTime, setEditTime] = useState(task.dueDate && task.dueDate.includes('T') ? task.dueDate.split('T')[1]?.slice(0,5) : '');
  const [editEmoji, setEditEmoji] = useState(task.emoji||'📌');
  const [tab, setTab] = useState('detail');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const surface = dark?'#1a1a1a':'#fff', txt = dark?'#f0f0f0':'#0a0a0a';
  const muted = dark?'#777':'#aaa', bdr = dark?'#2a2a2a':'#efefef';

  // รวม currentUser + friends เพื่อใช้แสดงชื่อจริง
  const allUsers = [
    { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
    ...friends.map(f => ({ id: f.uid, name: f.name, avatar: f.avatar }))
  ];

  const getUserById = (uid) => allUsers.find(u => u.id === uid) || { id: uid, name: 'Unknown', avatar: null };

  // members ของ list สำหรับ Assign to
  const memberUsers = listMembers
    .map(uid => allUsers.find(u => u.id === uid))
    .filter(Boolean);

  const save = () => {
    const assigneeUser = memberUsers.find(u => u.id === editAssignee);
    const fullDueDate = editDue ? (editTime ? `${editDue}T${editTime}` : editDue) : null;
    onSave({
      ...task,
      text: editText,
      priority: editPrio,
      assignee: editAssignee || null,
      assigneeName: assigneeUser?.name || null,
      dueDate: fullDueDate,
      emoji: editEmoji
    });
  };

  const addComment = () => {
    if (!comment.trim()) return;
    onUpdate({...task, comments:[...task.comments, {id:genId(), userId:currentUser.id, text:comment.trim(), createdAt:ts()}]});
    setComment('');
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div style={{background:surface,borderRadius:18,width:480,maxWidth:'95vw',maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column',animation:'fadeUp .2s ease-out'}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:'18px 20px 0',borderBottom:`1px solid ${bdr}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{position:'relative',display:'flex',alignItems:'center'}}>
                <span
                  onClick={() => setShowEmojiPicker(v=>!v)}
                  style={{fontSize:24,cursor:'pointer',userSelect:'none',padding:'0 4px'}}
                >
                  {editEmoji}
                </span>
                {showEmojiPicker && (
                  <div style={{
                    position:'absolute',top:36,left:0,zIndex:100,
                    background:dark?'#1a1a1a':'#fff',
                    border:`1px solid ${bdr}`,borderRadius:12,
                    padding:10,width:260,
                    boxShadow:'0 4px 24px rgba(0,0,0,.12)'
                  }}>
                    {/* พิมพ์ emoji โดยตรง */}
                    <input
                      autoFocus
                      placeholder="พิมพ์ emoji หรือข้อความ..."
                      onChange={e => {
                        const val = e.target.value;
                        if (val) setEditEmoji(val.slice(-2) || val.slice(-1));
                      }}
                      style={{
                        width:'100%',padding:'7px 10px',borderRadius:8,marginBottom:8,
                        border:`1px solid ${bdr}`,background:dark?'#252525':'#f5f5f5',
                        color:txt,fontSize:14,outline:'none',boxSizing:'border-box',
                        fontFamily:'Epilogue,sans-serif'
                      }}
                    />
                    {/* เลือกจาก preset */}
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {EMOJIS_LIST.map(em=>(
                        <button key={em} onClick={()=>{setEditEmoji(em);setShowEmojiPicker(false);}}
                          style={{
                            background:editEmoji===em?(dark?'#333':'#f0f0f0'):'transparent',
                            border:'none',borderRadius:6,padding:'4px 6px',
                            fontSize:18,cursor:'pointer'
                          }}>{em}</button>
                      ))}
                    </div>
                    <button onClick={()=>setShowEmojiPicker(false)} style={{
                      width:'100%',marginTop:8,padding:'6px',borderRadius:8,
                      border:`1px solid ${bdr}`,background:'transparent',
                      color:muted,fontFamily:'Epilogue,sans-serif',fontSize:12,cursor:'pointer'
                    }}>Close</button>
                  </div>
                )}
              </div>
              <input value={editText} onChange={e=>setEditText(e.target.value)} style={{fontFamily:'Fraunces,serif',fontSize:18,color:txt,background:'none',border:'none',outline:'none',width:280}}/>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:muted,fontSize:22,lineHeight:1,padding:'0 4px'}}>×</button>
          </div>
          <div style={{display:'flex',gap:4}}>
            {['detail','comments'].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',cursor:'pointer',padding:'7px 14px',fontFamily:'Epilogue,sans-serif',fontSize:13,fontWeight:tab===t?600:400,color:tab===t?txt:muted,borderBottom:tab===t?`2px solid ${txt}`:'2px solid transparent'}}>
                {t.charAt(0).toUpperCase()+t.slice(1)}{t==='comments'&&task.comments.length>0?` (${task.comments.length})`:''}
              </button>
            ))}
          </div>
        </div>

        <div style={{overflow:'auto',flex:1,padding:'18px 20px'}}>

          {/* Detail Tab */}
          {tab==='detail'&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:muted,display:'block',marginBottom:7,letterSpacing:'.06em'}}>PRIORITY</label>
                <div style={{display:'flex',gap:6}}>
                  {PRIORITIES.map(p=>(
                    <button key={p} onClick={()=>setEditPrio(p)} style={{padding:'5px 14px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:700,border:`1.5px solid ${editPrio===p?P_COLOR[p]:bdr}`,background:editPrio===p?P_BG[p]:'transparent',color:editPrio===p?P_COLOR[p]:muted}}>{p}</button>
                  ))}
                </div>
              </div>

              {/* Assign to — ใช้ชื่อจริง */}
              <div>
                <label style={{fontSize:10,fontWeight:700,color:muted,display:'block',marginBottom:7,letterSpacing:'.06em'}}>ASSIGN TO</label>
                <select value={editAssignee} onChange={e=>setEditAssignee(e.target.value)} style={{width:'100%',background:dark?'#252525':'#f8f8f8',border:`1px solid ${bdr}`,borderRadius:9,padding:'9px 12px',color:txt,fontSize:13,outline:'none'}}>
                  <option value="">Unassigned</option>
                  {memberUsers.map(u=>(
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{fontSize:10,fontWeight:700,color:muted,display:'block',marginBottom:7,letterSpacing:'.06em'}}>DUE DATE</label>
                <div style={{display:'flex',gap:8}}>
                  <input type="date" value={editDue} onChange={e=>setEditDue(e.target.value)} style={{flex:1,background:dark?'#252525':'#f8f8f8',border:`1px solid ${bdr}`,borderRadius:9,padding:'9px 12px',color:txt,fontSize:13,outline:'none'}}/>
                  <input type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} style={{width:110,background:dark?'#252525':'#f8f8f8',border:`1px solid ${bdr}`,borderRadius:9,padding:'9px 12px',color:txt,fontSize:13,outline:'none'}}/>
                </div>
              </div>

              <div>
                <label style={{fontSize:10,fontWeight:700,color:muted,display:'block',marginBottom:8,letterSpacing:'.06em'}}>REACTIONS</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {REACTIONS_LIST.map(em=>{
                    const us=task.reactions[em]||[];
                    return <button key={em} onClick={()=>onReact(task.id,em)} style={{background:us.includes(currentUser.id)?(dark?'#2a2a2a':'#f0f0f0'):'transparent',border:`1.5px solid ${bdr}`,borderRadius:20,padding:'5px 12px',cursor:'pointer',fontSize:13,color:txt,display:'flex',gap:4,alignItems:'center'}}>{em}{us.length>0&&<span style={{fontSize:12}}>{us.length}</span>}</button>;
                  })}
                </div>
              </div>

              {task.completed&&task.completedBy&&(
                <div style={{background:dark?'#1a2a20':'#E4F7EC',borderRadius:10,padding:'10px 14px',display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'#D6FFE4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>
                    {getUserById(task.completedBy).avatar
                      ? <img src={getUserById(task.completedBy).avatar} style={{width:24,height:24,borderRadius:'50%'}} alt=""/>
                      : '👤'
                    }
                  </div>
                  <span style={{fontSize:13,color:'#2f8a55',fontFamily:'Epilogue,sans-serif'}}>Completed by <strong>{getUserById(task.completedBy).name}</strong></span>
                </div>
              )}
              <button onClick={save} style={{background:'#0a0a0a',color:'#fafafa',border:'none',borderRadius:10,padding:11,cursor:'pointer',fontFamily:'Epilogue,sans-serif',fontWeight:600,fontSize:14}}>Save Changes</button>
            </div>
          )}

          {/* Comments Tab */}
          {tab==='comments'&&(
            <div>
              {task.comments.length===0&&(
                <p style={{color:muted,fontSize:13,fontFamily:'Epilogue,sans-serif',padding:'8px 0'}}>No comments yet. Be the first!</p>
              )}
              {task.comments.map(c=>{
                const u = getUserById(c.userId);
                return (
                  <div key={c.id} style={{display:'flex',gap:10,marginBottom:14}}>
                    {u.avatar
                      ? <img src={u.avatar} style={{width:30,height:30,borderRadius:'50%',flexShrink:0}} alt=""/>
                      : <div style={{width:30,height:30,borderRadius:'50%',background:'#D6E8FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>👤</div>
                    }
                    <div style={{flex:1}}>
                      <div style={{display:'flex',gap:8,alignItems:'baseline',marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:600,color:txt,fontFamily:'Epilogue,sans-serif'}}>{u.name}</span>
                        <span style={{fontSize:11,color:muted}}>{timeAgo(c.createdAt)}</span>
                      </div>
                      <div style={{background:dark?'#252525':'#f5f5f5',borderRadius:'4px 12px 12px 12px',padding:'8px 12px'}}>
                        <p style={{fontSize:13,color:txt,fontFamily:'Epilogue,sans-serif',margin:0}}>{c.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{display:'flex',gap:8,marginTop:10}}>
                {currentUser.avatar
                  ? <img src={currentUser.avatar} style={{width:30,height:30,borderRadius:'50%',flexShrink:0}} alt=""/>
                  : <div style={{width:30,height:30,borderRadius:'50%',background:'#D6E8FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>👤</div>
                }
                <input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addComment()} placeholder="Write a comment..." style={{flex:1,background:dark?'#252525':'#f5f5f5',border:`1px solid ${bdr}`,borderRadius:10,padding:'8px 12px',color:txt,fontSize:13,outline:'none'}}/>
                <button onClick={addComment} style={{background:'#0a0a0a',color:'#fafafa',border:'none',borderRadius:10,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Epilogue,sans-serif'}}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



const EditListModal = ({dark, currentUser, friends=[], list, onClose, onSave}) => {
  const [name, setName] = useState(list.name);
  const [cat, setCat] = useState(list.category);
  const [color, setColor] = useState(list.color);
  const [isPrivate, setIsPrivate] = useState(list.isPrivate);
  const [selectedFriends, setSelectedFriends] = useState(
    (list.memberIds || []).filter(id => id !== currentUser.id)
  );

  const txt = dark?'#f0f0f0':'#0a0a0a', bg = dark?'#1a1a1a':'#fff';
  const bdr = dark?'#2a2a2a':'#efefef', muted = dark?'#666':'#aaa';

  const toggleFriend = (uid) => {
    setSelectedFriends(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const memberIds = [currentUser.id, ...selectedFriends];
    onSave({
      ...list,
      name: name.trim(),
      category: cat,
      color,
      isPrivate,
      isGroup: selectedFriends.length > 0,
      members: memberIds,
      memberIds,
    });
  };

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,borderRadius:20,padding:28,width:'100%',maxWidth:400,maxHeight:'85vh',overflow:'auto'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontFamily:'Fraunces,serif',fontSize:22,color:txt,margin:0}}>Edit List</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:muted}}>✕</button>
        </div>

        {/* Name */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:'.08em',marginBottom:6}}>LIST NAME</div>
          <input value={name} onChange={e=>setName(e.target.value)}
            style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${bdr}`,background:dark?'#252525':'#f5f5f5',color:txt,fontFamily:'Epilogue,sans-serif',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
        </div>

        {/* Category */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:'.08em',marginBottom:6}}>CATEGORY</div>
          <select value={cat} onChange={e=>setCat(e.target.value)}
            style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${bdr}`,background:dark?'#252525':'#f5f5f5',color:txt,fontFamily:'Epilogue,sans-serif',fontSize:14,outline:'none'}}>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Color */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:'.08em',marginBottom:6}}>COLOR</div>
          <div style={{display:'flex',gap:8}}>
            {PASTEL_COLORS.map(c=>(
              <button key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:color===c?'2.5px solid #0a0a0a':'2px solid transparent',cursor:'pointer'}}/>
            ))}
          </div>
        </div>

        {/* Private toggle */}
        <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>setIsPrivate(!isPrivate)} style={{
            width:38,height:22,borderRadius:11,border:'none',cursor:'pointer',
            background:isPrivate?'#0a0a0a':'#ddd',position:'relative',transition:'background .2s'
          }}>
            <div style={{position:'absolute',top:3,left:isPrivate?18:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
          </button>
          <span style={{fontSize:13,color:txt}}>🔒 Private (เฉพาะคุณเห็น)</span>
        </div>

        {/* Members */}
        {!isPrivate && friends.length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:'.08em',marginBottom:6}}>MEMBERS</div>
            {friends.map(f=>(
              <div key={f.uid} onClick={()=>toggleFriend(f.uid)} style={{
                display:'flex',alignItems:'center',gap:10,padding:'8px 10px',
                borderRadius:10,cursor:'pointer',marginBottom:4,
                background:selectedFriends.includes(f.uid)?(dark?'#252525':'#f0f0f0'):'transparent'
              }}>
                {f.avatar
                  ? <img src={f.avatar} style={{width:30,height:30,borderRadius:'50%'}} alt=""/>
                  : <div style={{width:30,height:30,borderRadius:'50%',background:'#D6E8FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>👤</div>
                }
                <span style={{flex:1,fontSize:13,color:txt}}>{f.name}</span>
                {selectedFriends.includes(f.uid)
                  ? <span style={{color:'#2f8a55',fontWeight:700}}>✓</span>
                  : <span style={{color:muted,fontSize:12}}>+ Add</span>
                }
              </div>
            ))}
          </div>
        )}

        {/* Save */}
        <button onClick={handleSave} style={{
          width:'100%',padding:'12px',borderRadius:12,background:'#0a0a0a',
          color:'#fafafa',border:'none',cursor:'pointer',fontFamily:'Epilogue,sans-serif',
          fontSize:15,fontWeight:600,marginTop:4
        }}>Save Changes</button>

      </div>
    </div>
  );
};



// ── Create List Modal ─────────────────────────────────────────────────────────
const CreateListModal = ({dark, currentUser, onClose, onCreate, friends=[]}) => {
  const [name,setName]=useState('');
  const [cat,setCat]=useState('Personal');
  const [color,setColor]=useState(PASTEL_COLORS[0]);
  const [isPrivate,setIsPrivate]=useState(false);
  const [isGroup,setIsGroup]=useState(false);
  const [selectedFriends,setSelectedFriends]=useState([]);

  const txt=dark?'#f0f0f0':'#0a0a0a', bg=dark?'#1a1a1a':'#fff';
  const bdr=dark?'#2a2a2a':'#efefef', muted=dark?'#666':'#aaa';

  const toggleFriend=(uid)=>{
    setSelectedFriends(prev=>
      prev.includes(uid) ? prev.filter(id=>id!==uid) : [...prev,uid]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const memberIds = [currentUser.id];
    onCreate({
      id: genId(), name: name.trim(), category: cat, color,
      isPrivate, isGroup: isGroup || selectedFriends.length > 0,
      members: memberIds, memberIds,
      selectedFriends, // ส่ง selectedFriends ออกไปด้วย
      createdBy: currentUser.id, createdAt: ts(), tasks: []
    });
    onClose();
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
      <div style={{background:bg,borderRadius:20,padding:28,width:'100%',maxWidth:400,maxHeight:'85vh',overflow:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontFamily:'Fraunces,serif',fontSize:22,color:txt,margin:0}}>New List</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:muted}}>✕</button>
        </div>

        {/* Name */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:'.08em',marginBottom:6}}>LIST NAME</div>
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleCreate()}
            placeholder="e.g. Trip to Japan 🗾"
            style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${bdr}`,background:dark?'#252525':'#f5f5f5',color:txt,fontFamily:'Epilogue,sans-serif',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
        </div>

        {/* Category */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:'.08em',marginBottom:6}}>CATEGORY</div>
          <select value={cat} onChange={e=>setCat(e.target.value)}
            style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${bdr}`,background:dark?'#252525':'#f5f5f5',color:txt,fontFamily:'Epilogue,sans-serif',fontSize:14,outline:'none'}}>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Color */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:'.08em',marginBottom:6}}>COLOR</div>
          <div style={{display:'flex',gap:8}}>
            {PASTEL_COLORS.map(c=>(
              <button key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:color===c?'2.5px solid #0a0a0a':'2px solid transparent',cursor:'pointer'}}/>
            ))}
          </div>
        </div>

        {/* Private toggle */}
        <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>setIsPrivate(!isPrivate)} style={{
            width:38,height:22,borderRadius:11,border:'none',cursor:'pointer',
            background:isPrivate?'#0a0a0a':'#ddd',position:'relative',transition:'background .2s'
          }}>
            <div style={{position:'absolute',top:3,left:isPrivate?18:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
          </button>
          <span style={{fontSize:13,color:txt}}>🔒 Private (เฉพาะคุณเห็น)</span>
        </div>

        {/* Invite Friends */}
        {!isPrivate && friends.length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:'.08em',marginBottom:6}}>INVITE FRIENDS</div>
            {friends.map(f=>(
              <div key={f.uid} onClick={()=>toggleFriend(f.uid)} style={{
                display:'flex',alignItems:'center',gap:10,padding:'8px 10px',
                borderRadius:10,cursor:'pointer',marginBottom:4,
                background:selectedFriends.includes(f.uid)?(dark?'#252525':'#f0f0f0'):'transparent'
              }}>
                {f.avatar
                  ? <img src={f.avatar} style={{width:30,height:30,borderRadius:'50%'}} alt=""/>
                  : <div style={{width:30,height:30,borderRadius:'50%',background:'#D6E8FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>👤</div>
                }
                <span style={{flex:1,fontSize:13,color:txt}}>{f.name}</span>
                {selectedFriends.includes(f.uid) && <span style={{color:'#2f8a55',fontWeight:700}}>✓</span>}
              </div>
            ))}
          </div>
        )}

        <button onClick={handleCreate} style={{
          width:'100%',padding:'12px',borderRadius:12,background:'#0a0a0a',
          color:'#fafafa',border:'none',cursor:'pointer',fontFamily:'Epilogue,sans-serif',
          fontSize:15,fontWeight:600,marginTop:4
        }}>Create List</button>
      </div>
    </div>
  );
};

// ── AI Suggestions ────────────────────────────────────────────────────────────
const AISuggestions = ({listName,dark,onAddTask,onClose}) => {
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [added,setAdded]=useState([]);
  const surface=dark?'#1c1c1c':'#fff', txt=dark?'#f0f0f0':'#0a0a0a';
  const bdr=dark?'#2a2a2a':'#f0f0f0', muted=dark?'#666':'#aaa';

  useEffect(()=>{
    (async()=>{
      try {
        const res=await fetch('https://api.anthropic.com/v1/messages',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            model:'claude-sonnet-4-20250514',max_tokens:300,
            messages:[{role:'user',content:`Give exactly 6 short checklist items for a list called "${listName}". Return ONLY a valid JSON array of 6 strings. No markdown, no extra text.`}],
          }),
        });
        const d=await res.json();
        const raw=d.content.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
        setItems(JSON.parse(raw));
      } catch {
        setItems(['Research options','Set a deadline','Create a budget','Assign responsibilities','Review progress','Finalize and submit']);
      } finally{setLoading(false);}
    })();
  },[listName]);

  return (
    <div style={{background:surface,border:`1.5px solid ${bdr}`,borderRadius:14,padding:16,marginTop:8,animation:'fadeUp .2s ease-out'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span>✨</span>
          <span style={{fontFamily:'Fraunces,serif',fontSize:15,color:txt}}>AI Suggestions</span>
          {loading&&<span style={{fontSize:11,color:muted,animation:'shimmer 1.4s ease infinite'}}>thinking...</span>}
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:muted,fontSize:18,lineHeight:1}}>×</button>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
        {loading
          ?Array.from({length:4},(_,i)=><div key={i} style={{height:30,width:80+i*20,borderRadius:20,background:dark?'#2a2a2a':'#f0f0f0',animation:`shimmer 1.4s ease ${i*.1}s infinite`}}/>)
          :items.map((s,i)=>(
            <button key={i} onClick={()=>{if(!added.includes(i)){onAddTask(s);setAdded(a=>[...a,i]);}}} style={{padding:'6px 13px',borderRadius:20,fontFamily:'Epilogue,sans-serif',fontSize:13,cursor:'pointer',border:`1.5px solid ${added.includes(i)?'#0a0a0a':(dark?'#333':'#ddd')}`,background:added.includes(i)?'#0a0a0a':'transparent',color:added.includes(i)?'#fafafa':txt,transition:'all .15s'}}>
              {added.includes(i)?'✓ ':''}{s}
            </button>
          ))
        }
      </div>
    </div>
  );
};

// ── Leaderboard ───────────────────────────────────────────────────────────────
const LeaderboardView = ({lists, dark, friends, currentUser}) => {
  const txt=dark?'#f0f0f0':'#0a0a0a', bg=dark?'#1a1a1a':'#fff';
  const muted=dark?'#666':'#aaa', bdr=dark?'#2a2a2a':'#efefef';

  // รวม currentUser + friends เพื่อแสดงใน leaderboard
  const people = [currentUser, ...friends.map(f => ({
    id: f.uid, name: f.name, avatar: f.avatar
  }))];

  const scores = people.map(person => {
    const completed = lists.flatMap(l => l.tasks)
      .filter(t => t.completedBy === person.id).length;
    const added = lists.flatMap(l => l.tasks)
      .filter(t => t.createdBy === person.id).length;
    return { ...person, completed, added, score: completed * 2 + added };
  }).sort((a, b) => b.score - a.score);

  const medals = ['🥇','🥈','🥉'];

  return (
    <div style={{padding:'28px',maxWidth:520}}>
      <h2 style={{fontFamily:'Fraunces,serif',fontSize:26,color:txt,marginBottom:4}}>Leaderboard 🏆</h2>
      <p style={{color:muted,fontSize:13,fontFamily:'Epilogue,sans-serif',marginBottom:24}}>คะแนนจากการทำและสร้าง tasks</p>
      {scores.map((s, i) => (
        <div key={s.id} style={{
          background:bg, border:`1.5px solid ${bdr}`, borderRadius:14,
          padding:'14px 18px', marginBottom:10,
          display:'flex', alignItems:'center', gap:14
        }}>
          <div style={{fontSize:22, width:28}}>{medals[i] || `${i+1}`}</div>
          {s.avatar
            ? <img src={s.avatar} style={{width:38,height:38,borderRadius:'50%'}} alt=""/>
            : <div style={{width:38,height:38,borderRadius:'50%',background:'#D6E8FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>👤</div>
          }
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:15,color:txt}}>{s.name}</div>
            <div style={{fontSize:12,color:muted}}>✅ {s.completed} completed · ➕ {s.added} added</div>
          </div>
          <div style={{fontFamily:'Fraunces,serif',fontSize:22,color:txt,fontWeight:700}}>{s.score}</div>
        </div>
      ))}
      {scores.length === 0 && (
        <div style={{textAlign:'center',padding:'44px 0',color:muted}}>
          <div style={{fontSize:40,marginBottom:10}}>🏆</div>
          <p style={{fontFamily:'Epilogue,sans-serif',fontSize:14}}>เพิ่ม friend และทำ tasks เพื่อดู leaderboard</p>
        </div>
      )}
    </div>
  );
};


// ── Activity Feed ─────────────────────────────────────────────────────────────
const ActivityView = ({activity, dark, currentUser, friends}) => {
  const txt=dark?'#f0f0f0':'#0a0a0a', muted=dark?'#777':'#aaa', bdr=dark?'#2a2a2a':'#f0f0f0';
  const actionColor=(a)=>a==='completed'?'#2f8a55':a==='added'?'#2a5fb0':'#888';

  const getActivityUser = (userId) => {
    if (userId === currentUser.id) return currentUser;
    const friend = friends.find(f => f.uid === userId);
    if (friend) return { id: friend.uid, name: friend.name, avatar: friend.avatar };
    return { id: userId, name: 'Someone', avatar: null };
  };

  return (
    <div style={{padding:28,animation:'fadeUp .2s ease-out'}}>
      <h2 style={{fontFamily:'Fraunces,serif',fontSize:32,color:txt,marginBottom:4}}>Activity</h2>
      <p style={{color:muted,fontFamily:'Epilogue,sans-serif',fontSize:14,marginBottom:28}}>Everything happening across your lists</p>
      <div style={{maxWidth:520}}>
        {activity.length === 0 && (
          <div style={{textAlign:'center',padding:'44px 0',color:muted}}>
            <div style={{fontSize:40,marginBottom:10}}>⚡</div>
            <p style={{fontFamily:'Epilogue,sans-serif',fontSize:14}}>ยังไม่มี activity ลองสร้าง list หรือเพิ่ม task ดูครับ</p>
          </div>
        )}
        {activity.map((a,i)=>{
          const u = getActivityUser(a.userId);
          return (
            <div key={a.id} style={{display:'flex',gap:12,marginBottom:18,position:'relative'}}>
              {i<activity.length-1&&<div style={{position:'absolute',left:14,top:32,bottom:-10,width:1.5,background:bdr}}/>}
              {u.avatar
                ? <img src={u.avatar} style={{width:30,height:30,borderRadius:'50%',flexShrink:0}} alt=""/>
                : <div style={{width:30,height:30,borderRadius:'50%',background:'#D6E8FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>👤</div>
              }
              <div style={{paddingTop:3}}>
                <p style={{fontFamily:'Epilogue,sans-serif',fontSize:13,color:txt,margin:'0 0 2px'}}>
                  <strong>{u.name}</strong>
                  <span style={{color:actionColor(a.action)}}> {a.action} </span>
                  <span style={{fontStyle:'italic'}}>"{a.target}"</span>
                </p>
                <p style={{fontFamily:'Epilogue,sans-serif',fontSize:11,color:muted,margin:0}}>
                  {a.listName} · {a.createdAt?.toMillis ? timeAgo(new Date(a.createdAt.toMillis()).toISOString()) : timeAgo(a.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};




// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  const firestoreLists = useLists(firebaseUser?.uid ?? null);
  const [lists, setLists] = useState([]);
  const [activity, setActivity] = useState([]);
  const [selId,setSelId]=useState('list1');
  const [dark,setDark]=useState(false);
  const [view,setView]=useState('list');
  const [showCreate,setShowCreate]=useState(false);
  const [taskDetail,setTaskDetail]=useState(null);
  const [confetti,setConfetti]=useState(false);
  const [newText,setNewText]=useState('');
  const [newPrio,setNewPrio]=useState('MED');
  const [newAssignee,setNewAssignee]=useState('');
  const [newDue,setNewDue]=useState('');
  const [newTime, setNewTime] = useState('');
  const [sortBy,setSortBy]=useState('default');
  const [showAI,setShowAI]=useState(false);
  const [expandAdd,setExpandAdd]=useState(false);

  const [showFriends, setShowFriends] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(212);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isResizing = useRef(false);
  const currentUser = firebaseUser ? {
    id: firebaseUser.uid,
    name: firebaseUser.displayName,
    avatar: firebaseUser.photoURL,
    email: firebaseUser.email,
  } : { id: '', name: '', avatar: '', email: '' };
  const friends = useFriends(currentUser.id);
  const listInvites = useListInvites(currentUser.id);
  const friendRequests = useFriendRequests(currentUser.id);
  const friendIds = friends.map(f => f.uid);
  const firestoreActivity = useActivity(firebaseUser?.uid, friendIds);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      saveUserProfile(firebaseUser);
    }
  }, [firebaseUser]);

  useEffect(() => {
    setLists(firestoreLists);
  }, [firestoreLists]);

  useEffect(() => {
    if (firestoreActivity.length > 0) {
      setActivity(firestoreActivity);
    }
  }, [firestoreActivity]);

  const updateList = useCallback((id, fn) => {
    setLists(prev => {
      const updated = prev.map(l => l.id === id ? fn(l) : l);
      const newList = updated.find(l => l.id === id);
      if (newList) updateListInDB(id, newList);
      return updated;
    });
  }, []);

  const pushActivity = useCallback((userId, action, target, listName) => {
    const item = { id: genId(), userId, action, target, listName, createdAt: new Date().toISOString() };
    setActivity(prev => [item, ...prev].slice(0, 50));
    // เก็บลง Firestore ด้วย
    if (firebaseUser?.uid) {
      pushActivityToDB(firebaseUser.uid, { userId, action, target, listName });
    }
  }, [firebaseUser]);

  const sel=lists.find(l=>l.id===selId);

  const sortedTasks=useMemo(()=>{
    if(!sel) return [];
    const t=[...sel.tasks];
    if(sortBy==='priority'){const o={HIGH:0,MED:1,LOW:2};return t.sort((a,b)=>o[a.priority]-o[b.priority]);}
    if(sortBy==='deadline') return t.sort((a,b)=>{if(!a.dueDate)return 1;if(!b.dueDate)return -1;return new Date(a.dueDate)-new Date(b.dueDate);});
    if(sortBy==='completion') return t.sort((a,b)=>Number(a.completed)-Number(b.completed));
    return t;
  },[sel,sortBy]);

  const toggleTask=useCallback((taskId)=>{
    const list=lists.find(l=>l.id===selId); if(!list) return;
    const task=list.tasks.find(t=>t.id===taskId); if(!task) return;
    const wasCompleted=task.completed;
    updateList(selId,l=>{
      const newTasks=l.tasks.map(t=>t.id!==taskId?t:{...t,completed:!t.completed,completedBy:!t.completed?currentUser.id:null,completedAt:!t.completed?ts():null});
      const allDone=newTasks.length>0&&newTasks.every(t=>t.completed);
      if(allDone){setConfetti(true);setTimeout(()=>setConfetti(false),3500);}
      return{...l,tasks:newTasks};
    });
    pushActivity(currentUser.id,wasCompleted?'uncompleted':'completed',task.text,list.name);
  },[lists,selId,currentUser,updateList,pushActivity]);

  const addTask=useCallback(()=>{
    if(!newText.trim()||!selId) return;
    const assigneeUser = newAssignee ? [...friends.map(f=>({id:f.uid,name:f.name})), {id:currentUser.id,name:currentUser.name}].find(u=>u.id===newAssignee) : null;
    const task={id:genId(),text:newText.trim(),completed:false,completedBy:null,completedAt:null,
  assignee:newAssignee||null,assigneeName:assigneeUser?.name||null,priority:newPrio,dueDate: newDue ? (newTime ? `${newDue}T${newTime}` : newDue) : null,
      emoji:EMOJIS_LIST[Math.floor(Math.random()*5)],reactions:{},comments:[],
      createdBy:currentUser.id,createdAt:ts()};
    const list=lists.find(l=>l.id===selId);
    updateList(selId,l=>({...l,tasks:[...l.tasks,task]}));
    pushActivity(currentUser.id,'added',task.text,list?.name||'');
    setNewText('');setNewDue('');setNewTime('');setNewAssignee('');setExpandAdd(false);
  },[newText,newPrio,newAssignee,newDue,selId,lists,currentUser,updateList,pushActivity]);

  const deleteTask=useCallback((taskId)=>{updateList(selId,l=>({...l,tasks:l.tasks.filter(t=>t.id!==taskId)}));},[selId,updateList]);
  const reactToTask=useCallback((taskId,emoji)=>{
    updateList(selId,l=>({...l,tasks:l.tasks.map(t=>{
      if(t.id!==taskId) return t;
      const us=t.reactions[emoji]||[];
      return{...t,reactions:{...t.reactions,[emoji]:us.includes(currentUser.id)?us.filter(u=>u!==currentUser.id):[...us,currentUser.id]}};
    })}));
  },[selId,currentUser,updateList]);

  const updateTask=useCallback((ut)=>{
    updateList(selId,l=>({...l,tasks:l.tasks.map(t=>t.id===ut.id?ut:t)}));
    setTaskDetail(ut);
  },[selId,updateList]);

  const createList = useCallback(async (data) => {
    const { selectedFriends: inviteFriends = [], ...listData } = data;
    const id = await createListInDB(listData);
    // ส่ง invite ให้เพื่อนที่เลือก
    for (const friendUid of inviteFriends) {
      await sendListInvite(currentUser, friendUid, { ...listData, id });
    }
    setSelId(id);
    setView('list');
    pushActivity(currentUser.id, 'created list', data.name, data.name);
  }, [currentUser, pushActivity]);

  const deleteList = useCallback((id) => {
    deleteListInDB(id);
    setLists(prev => prev.filter(l => l.id !== id));
    if (selId === id) setSelId(lists.find(l => l.id !== id)?.id || null);
  }, [lists, selId]);

  // Loading
  if (firebaseUser === undefined) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'Epilogue, sans-serif',
        fontSize: 14, color: '#888'
      }}>
        Loading...
      </div>
    );
  }

  // Not logged in
  if (firebaseUser === null) {
    return <Login />;
  }

  // Theme vars
  const bg=dark?'#111':'#f8f8f8', txt=dark?'#f0f0f0':'#0a0a0a';
  const effectiveSidebarWidth = sidebarCollapsed ? 0 : sidebarWidth;
  const muted=dark?'#666':'#aaa', bdr=dark?'#2a2a2a':'#efefef';
  const surface=dark?'#1a1a1a':'#fff';
  const personal=lists.filter(l=>!l.isGroup), group=lists.filter(l=>l.isGroup);

  return (
    <>
      <style>{GCSS}</style>
      <Confetti active={confetti}/>
      {showCreate && <CreateListModal dark={dark} currentUser={currentUser} friends={friends} onClose={()=>setShowCreate(false)} onCreate={createList}/>}      
      {editingList && (
        <EditListModal
          dark={dark}
          currentUser={currentUser}
          friends={friends}
          list={editingList}
          onClose={() => setEditingList(null)}
          onSave={(updated) => {
            updateList(updated.id, () => updated);
            setEditingList(null);
          }}
        />
      )}
      {showProfile && (
        <ProfileModal
          currentUser={currentUser}
          dark={dark}
          onClose={() => setShowProfile(false)}
          onUpdate={(updated) => {
            setShowProfile(false);
          }}
        />
      )}
      {showFriends && <FriendPanel currentUser={currentUser} dark={dark} onClose={() => setShowFriends(false)} />}
      {showInvites && (
        <div onClick={() => setShowInvites(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
          <div onClick={e => e.stopPropagation()} style={{background:surface,borderRadius:20,padding:28,width:'100%',maxWidth:420,maxHeight:'80vh',overflow:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h2 style={{fontFamily:'Fraunces,serif',fontSize:22,color:txt,margin:0}}>📬 List Invites</h2>
              <button onClick={() => setShowInvites(false)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:muted}}>✕</button>
            </div>
            {listInvites.length === 0 && (
              <div style={{textAlign:'center',padding:'32px 0',color:muted,fontSize:13}}>ไม่มี invite ตอนนี้ครับ</div>
            )}
            {listInvites.map(inv => (
              <div key={inv.listId} style={{background:inv.listColor||'#D6E8FF',borderRadius:14,padding:'14px 16px',marginBottom:10}}>
                <div style={{fontFamily:'Fraunces,serif',fontSize:16,color:'#0a0a0a',marginBottom:4}}>{inv.listName}</div>
                <div style={{fontSize:12,color:'rgba(0,0,0,.5)',marginBottom:12}}>invited by {inv.invitedBy}</div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={async () => { await acceptListInvite(firebaseUser.uid, inv); }} style={{background:'#0a0a0a',color:'#fafafa',border:'none',borderRadius:8,padding:'7px 16px',cursor:'pointer',fontFamily:'Epilogue,sans-serif',fontSize:13,fontWeight:600}}>✓ Join List</button>
                  <button onClick={async () => { await declineListInvite(firebaseUser.uid, inv.listId); }} style={{background:'rgba(200,50,50,.1)',color:'#c0392b',border:'none',borderRadius:8,padding:'7px 14px',cursor:'pointer',fontFamily:'Epilogue,sans-serif',fontSize:13}}>✕ Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {taskDetail&&<TaskDetailModal task={taskDetail} currentUser={currentUser} dark={dark} onClose={()=>setTaskDetail(null)} onUpdate={updateTask} onSave={(updatedTask)=>{updateTask(updatedTask);setTaskDetail(null);}} onReact={reactToTask} friends={friends} listMembers={sel?.memberIds||[]}/>}

      <div style={{display:'flex',height:'100vh',background:bg,fontFamily:'Epilogue,sans-serif',overflow:'hidden',position:'relative'}}>

        {/* ── SIDEBAR ──────────────────── */}
        <div style={{
          width: effectiveSidebarWidth,
          minWidth: sidebarCollapsed ? 0 : 160,
          maxWidth: 400,
          background:'#0a0a0a',
          display:'flex',
          flexDirection:'column',
          flexShrink:0,
          overflow:'hidden',
          position:'relative',
          transition: isResizing.current ? 'none' : 'width .2s ease'
        }}>
          {/* Decorative shapes */}
          <div style={{position:'absolute',top:-40,right:-40,width:100,height:100,borderRadius:'50%',background:'#FFD6E00d',pointerEvents:'none'}}/>
          <div style={{position:'absolute',bottom:100,left:-20,width:55,height:55,borderRadius:'50%',background:'#D6FFE40d',pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:'42%',right:-8,width:24,height:24,background:'#E8D6FF11',pointerEvents:'none',transform:'rotate(10deg)'}}/>

          {/* Logo */}
          <div style={{padding:'18px 16px 14px',borderBottom:'1px solid #ffffff0a',display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:30,height:30,background:'#fafafa',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:'#0a0a0a'}}>✓</div>
            <span style={{fontFamily:'Fraunces,serif',fontSize:19,color:'#fafafa',letterSpacing:'-.02em'}}>checkmate</span>
          </div>

          {/* User */}
          <div
            onClick={() => setShowProfile(true)}
            style={{padding:'12px 16px',borderBottom:'1px solid #ffffff0a',display:'flex',alignItems:'center',gap:10,cursor:'pointer',transition:'background .15s'}}
            onMouseEnter={e => e.currentTarget.style.background='#ffffff08'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          >
            <Avatar userId={currentUser.id} size={32}/>
            <div>
              <div style={{fontFamily:'Epilogue,sans-serif',fontWeight:600,fontSize:13,color:'#fafafa'}}>{currentUser.name}</div>
              <div style={{fontSize:10,color:'#444'}}>logged in as you</div>
            </div>
          </div>

          {/* Nav */}
          <div style={{padding:'10px 10px',overflowY:'auto',overflowX:'hidden',flex:1}}>
            {[{id:'activity',label:'Activity Feed',icon:'⚡'},{id:'leaderboard',label:'Leaderboard',icon:'🏆'}].map(v=>(
              <button key={v.id} onClick={()=>setView(v.id)} style={{width:'100%',textAlign:'left',background:view===v.id?'#ffffff10':'none',border:'none',borderRadius:8,padding:'8px 10px',cursor:'pointer',color:view===v.id?'#fafafa':'#555',fontFamily:'Epilogue,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:8,marginBottom:1}}>
                <span>{v.icon}</span>{v.label}
              </button>
            ))}

            <div style={{height:1,background:'#ffffff08',margin:'10px 2px'}}/>
            <div style={{fontSize:9,fontWeight:700,color:'#333',letterSpacing:'.1em',padding:'4px 10px 6px'}}>PERSONAL</div>
              <DragDropContext onDragEnd={(result)=>{
                if(!result.destination) return;
                const items=[...personal];
                const [moved]=items.splice(result.source.index,1);
                items.splice(result.destination.index,0,moved);
                setLists(prev=>[...items,...prev.filter(l=>l.isGroup)]);
              }}>
                <Droppable droppableId="personal-lists">
                  {(provided)=>(
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {personal.map((l,index)=>(
                        <Draggable key={l.id} draggableId={l.id} index={index}>
                          {(provided)=>(
                            <div ref={provided.innerRef} {...provided.draggableProps} style={{display:'flex',alignItems:'center',gap:2}}>
                              <div {...provided.dragHandleProps} style={{cursor:'grab',color:'#444',fontSize:12,padding:'0 4px',flexShrink:0}}>⠿</div>
                              <button onClick={()=>{setSelId(l.id);setView('list');setShowAI(false);}} style={{flex:1,textAlign:'left',background:selId===l.id&&view==='list'?'#ffffff10':'none',border:'none',borderRadius:8,padding:'7px 10px',cursor:'pointer',color:selId===l.id&&view==='list'?'#fafafa':'#666',fontFamily:'Epilogue,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:8,marginBottom:1}}>
                                <div style={{width:8,height:8,borderRadius:'50%',background:l.color,flexShrink:0}}/>
                                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name}</span>
                                {l.isPrivate&&<span style={{fontSize:9,color:'#333'}}>🔒</span>}
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <div style={{fontSize:9,fontWeight:700,color:'#333',letterSpacing:'.1em',padding:'12px 10px 6px'}}>GROUP</div>
              <DragDropContext onDragEnd={(result)=>{
                if(!result.destination) return;
                const items=[...group];
                const [moved]=items.splice(result.source.index,1);
                items.splice(result.destination.index,0,moved);
                setLists(prev=>[...prev.filter(l=>!l.isGroup),...items]);
              }}>
                <Droppable droppableId="group-lists">
                  {(provided)=>(
                    <div {...provided.droppableProps} ref={provided.innerRef} style={{minHeight:8}}>
                      {group.map((l,index)=>(
                        <Draggable key={l.id} draggableId={l.id} index={index}>
                          {(provided, snapshot)=>(
                            <DraggableItem provided={provided} snapshot={snapshot}>
                              <div {...provided.dragHandleProps} style={{cursor:'grab',color:'#444',fontSize:12,padding:'0 4px',flexShrink:0}}>⠿</div>
                              <button onClick={()=>{setSelId(l.id);setView('list');setShowAI(false);}} style={{flex:1,textAlign:'left',background:selId===l.id&&view==='list'?'#ffffff10':'none',border:'none',borderRadius:8,padding:'7px 10px',cursor:'pointer',color:selId===l.id&&view==='list'?'#fafafa':'#666',fontFamily:'Epilogue,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:8,marginBottom:1}}>
                                <div style={{width:8,height:8,borderRadius:'50%',background:l.color,flexShrink:0}}/>
                                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name}</span>
                                <div style={{display:'flex'}}>
                                  {l.members.slice(0,3).map((m,i)=>(
                                    <div key={m} style={{marginLeft:i>0?-5:0,width:16,height:16,borderRadius:'50%',background:getUser(m).color,fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #0a0a0a'}}>{getUser(m).avatar}</div>
                                  ))}
                                </div>
                              </button>
                            </DraggableItem>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>


            <button onClick={() => setShowFriends(true)} style={{
              width:'100%', textAlign:'left', background:'none',
              border:'1px dashed #222', borderRadius:8, padding:'7px 10px',
              cursor:'pointer', color:'#444', fontFamily:'Epilogue,sans-serif',
              fontSize:13, display:'flex', alignItems:'center', gap:8, marginTop:8
            }}>
              👥 Friends {friendRequests.length > 0 && <span style={{background:'#e05555',color:'#fff',borderRadius:'50%',width:16,height:16,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>{friendRequests.length}</span>}
            </button>

            <button onClick={() => setShowInvites(true)} style={{
              width:'100%', textAlign:'left', background:'none',
              border:'1px dashed #222', borderRadius:8, padding:'7px 10px',
              cursor:'pointer', color:'#444', fontFamily:'Epilogue,sans-serif',
              fontSize:13, display:'flex', alignItems:'center', gap:8, marginTop:4
            }}>
              📬 Invites {listInvites.length > 0 && <span style={{background:'#e05555',color:'#fff',borderRadius:'50%',width:16,height:16,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>{listInvites.length}</span>}
            </button>

            <button onClick={()=>setShowCreate(true)} style={{width:'100%',textAlign:'left',background:'none',border:'1px dashed #222',borderRadius:8,padding:'7px 10px',cursor:'pointer',color:'#444',fontFamily:'Epilogue,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:8,marginTop:8}}>
              ＋ New List
            </button>


          </div>

          {/* Bottom */}
            <div style={{padding:'10px 16px',borderTop:'1px solid #ffffff08',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:9,color:'#2a2a2a',fontFamily:'Epilogue,sans-serif',letterSpacing:'.05em'}}>CHECKMATE v1.0</span>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>signOut(auth)} style={{background:'#ffffff0f',border:'none',borderRadius:16,padding:'4px 10px',cursor:'pointer',color:'#fafafa',fontSize:11}}>Sign out</button>
                <button onClick={()=>setSidebarCollapsed(!sidebarCollapsed)} style={{background:'#ffffff0f',border:'none',borderRadius:16,padding:'4px 10px',cursor:'pointer',color:'#fafafa',fontSize:13}}>{sidebarCollapsed ? '→' : '←'}</button>
                <button onClick={()=>setDark(!dark)} style={{background:'#ffffff0f',border:'none',borderRadius:16,padding:'4px 10px',cursor:'pointer',color:'#fafafa',fontSize:13}}>{dark?'☀️':'🌙'}</button>
              </div>
            </div>
            

            {/* Resize Handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                isResizing.current = true;
                const startX = e.clientX;
                const startWidth = sidebarWidth;
                const onMove = (ev) => {
                  const newWidth = startWidth + (ev.clientX - startX);
                  if (newWidth < 80) {
                    setSidebarCollapsed(true);
                  } else {
                    setSidebarCollapsed(false);
                    setSidebarWidth(Math.min(400, Math.max(160, newWidth)));
                  }
                };
                const onUp = () => {
                  isResizing.current = false;
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
              style={{
                position:'absolute', right:0, top:0, bottom:0,
                width:4, cursor:'col-resize',
                background:'transparent',
                zIndex:10,
              }}
              onMouseEnter={e => e.currentTarget.style.background='#ffffff20'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            />

            </div>


            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                style={{
                  position:'absolute', left:0, top:'50%', transform:'translateY(-50%)',
                  background:'#0a0a0a', color:'#fafafa', border:'none',
                  borderRadius:'0 8px 8px 0', padding:'12px 6px',
                  cursor:'pointer', fontSize:14, zIndex:20,
                  writingMode:'vertical-rl'
                }}
              >
                ☰
              </button>
            )}


        {/* ── MAIN ─────────────────────── */}
        <div style={{flex:1,overflow:'auto'}}>
          {view==='leaderboard'&&<LeaderboardView lists={lists} dark={dark} friends={friends} currentUser={currentUser}/>}
          {view==='activity'&&<ActivityView activity={activity} dark={dark} currentUser={currentUser} friends={friends}/>}

          {view==='list'&&!sel&&(
            <div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,color:muted}}>
              <div style={{fontSize:52}}>📋</div>
              <p style={{fontFamily:'Fraunces,serif',fontSize:22,color:txt}}>Pick or create a list</p>
              <button onClick={()=>setShowCreate(true)} style={{background:'#0a0a0a',color:'#fafafa',border:'none',borderRadius:12,padding:'11px 26px',cursor:'pointer',fontFamily:'Epilogue,sans-serif',fontSize:14,fontWeight:600}}>Create a List</button>
            </div>
          )}

          {view==='list'&&sel&&(
            <div style={{padding:'24px 28px',maxWidth:680,animation:'fadeUp .18s ease-out'}}>

              {/* Header card */}
              <div style={{background:sel.color,borderRadius:18,padding:'22px 26px',marginBottom:20,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',right:-28,top:-28,width:90,height:90,borderRadius:'50%',background:'rgba(0,0,0,.05)',pointerEvents:'none'}}/>
                <div style={{position:'absolute',right:22,bottom:-18,width:50,height:50,background:'rgba(0,0,0,.05)',transform:'rotate(18deg)',pointerEvents:'none'}}/>
                <div style={{position:'absolute',left:200,top:10,width:16,height:16,borderRadius:'50%',background:'rgba(0,0,0,.06)',pointerEvents:'none'}}/>

                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'relative'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:5,flexWrap:'wrap'}}>
                      <h1 style={{fontFamily:'Fraunces,serif',fontSize:24,color:'#0a0a0a',lineHeight:1.1}}>{sel.name}</h1>
                      {sel.isPrivate&&<span style={{fontSize:10,background:'rgba(0,0,0,.1)',padding:'2px 8px',borderRadius:20,color:'#333',fontFamily:'Epilogue,sans-serif',fontWeight:700}}>🔒 PRIVATE</span>}
                      {sel.isGroup&&<span style={{fontSize:10,background:'rgba(0,0,0,.1)',padding:'2px 8px',borderRadius:20,color:'#333',fontFamily:'Epilogue,sans-serif',fontWeight:700}}>👥 GROUP</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                      <span style={{fontSize:12,color:'rgba(0,0,0,.4)',fontFamily:'Epilogue,sans-serif'}}>{sel.category}</span>
                      <span style={{color:'rgba(0,0,0,.2)'}}>·</span>
                      <div style={{display:'flex'}}>
                        {sel.members.map((m,i)=><div key={m} style={{marginLeft:i>0?-6:0}}><Avatar userId={m} size={22}/></div>)}
                      </div>
                    </div>
                    <ProgressBar tasks={sel.tasks} dark={false}/>
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{background:'rgba(0,0,0,.1)',border:'none',borderRadius:8,padding:'6px 9px',fontSize:12,cursor:'pointer',fontFamily:'Epilogue,sans-serif',color:'#333',outline:'none'}}>
                      <option value="default">Default</option>
                      <option value="priority">Priority</option>
                      <option value="deadline">Deadline</option>
                      <option value="completion">Completion</option>
                    </select>
                    <button onClick={()=>setEditingList(sel)} style={{background:'rgba(0,0,0,.08)',border:'none',borderRadius:8,padding:'6px 11px',cursor:'pointer',fontSize:12,color:'#333',fontFamily:'Epilogue,sans-serif'}}>Edit</button>
                    <button onClick={()=>deleteList(sel.id)} style={{background:'rgba(200,50,50,.14)',border:'none',borderRadius:8,padding:'6px 11px',cursor:'pointer',fontSize:12,color:'#c0392b',fontFamily:'Epilogue,sans-serif'}}>Delete list</button>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              {sortedTasks.length===0&&(
                <div style={{textAlign:'center',padding:'44px 0',color:muted}}>
                  <div style={{fontSize:40,marginBottom:10}}>🌱</div>
                  <p style={{fontFamily:'Epilogue,sans-serif',fontSize:14}}>Empty list. Add your first task or try AI suggestions!</p>
                </div>
              )}
              <DragDropContext onDragEnd={(result)=>{
                if(!result.destination||!sel) return;
                const items=[...sel.tasks];
                const [moved]=items.splice(result.source.index,1);
                items.splice(result.destination.index,0,moved);
                updateList(selId,l=>({...l,tasks:items}));
              }}>
                <Droppable droppableId="tasks">
                  {(provided)=>(
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {sortedTasks.map((task,index)=>(
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided,snapshot)=>(
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.85 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <div {...provided.dragHandleProps} style={{cursor:'grab',color:muted,fontSize:14,flexShrink:0,padding:'4px 2px',display:'flex',alignItems:'center'}}>⠿</div>
                              <div style={{flex:1}}>
                                <TaskItem task={task} currentUser={currentUser} dark={dark} onToggle={toggleTask} onDelete={deleteTask} onReact={reactToTask} onOpenDetail={setTaskDetail}/>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Add Task */}
              <div style={{background:surface,border:`1.5px solid ${bdr}`,borderRadius:12,padding:'12px 14px',marginTop:4}}>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${dark?'#333':'#ccc'}`,flexShrink:0}}/>
                  <input value={newText} onChange={e=>setNewText(e.target.value)} onFocus={()=>setExpandAdd(true)} onKeyDown={e=>{if(e.key==='Enter')addTask();if(e.key==='Escape'){setExpandAdd(false);setNewText('');}}} placeholder="Add a task..." style={{flex:1,background:'none',border:'none',outline:'none',fontFamily:'Epilogue,sans-serif',fontSize:14,color:txt}}/>
                  {newText&&<button onClick={addTask} style={{background:'#0a0a0a',color:'#fafafa',border:'none',borderRadius:8,padding:'5px 14px',cursor:'pointer',fontSize:13,fontFamily:'Epilogue,sans-serif',fontWeight:600,flexShrink:0}}>Add</button>}
                </div>
                {expandAdd&&(
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',paddingLeft:30,marginTop:10,animation:'fadeUp .15s ease-out'}}>
                    <div style={{display:'flex',gap:5}}>
                      {PRIORITIES.map(p=>(
                        <button key={p} onClick={()=>setNewPrio(p)} style={{padding:'4px 11px',borderRadius:20,fontSize:11,cursor:'pointer',fontWeight:700,border:`1.5px solid ${newPrio===p?P_COLOR[p]:(dark?'#2a2a2a':'#e5e5e5')}`,background:newPrio===p?P_BG[p]:'transparent',color:newPrio===p?P_COLOR[p]:muted}}>{p}</button>
                      ))}
                    </div>
                    <select value={newAssignee} onChange={e=>setNewAssignee(e.target.value)} style={{background:dark?'#252525':'#f5f5f5',border:`1px solid ${bdr}`,borderRadius:8,padding:'4px 9px',fontSize:12,color:txt,cursor:'pointer',outline:'none'}}>
                      <option value="">Assign to...</option>
                      {[{id:currentUser.id,name:currentUser.name,avatar:currentUser.avatar},
                        ...friends.filter(f=>sel?.memberIds?.includes(f.uid)).map(f=>({id:f.uid,name:f.name,avatar:f.avatar}))
                      ].map(u=>(
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <div style={{display:'flex',gap:4}}>
                      <input type="date" value={newDue} onChange={e=>setNewDue(e.target.value)} style={{background:dark?'#252525':'#f5f5f5',border:`1px solid ${bdr}`,borderRadius:8,padding:'4px 9px',fontSize:12,color:txt,cursor:'pointer',outline:'none'}}/>
                      <input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} style={{background:dark?'#252525':'#f5f5f5',border:`1px solid ${bdr}`,borderRadius:8,padding:'4px 9px',fontSize:12,color:txt,cursor:'pointer',outline:'none',width:100}}/>
                    </div>
                  </div>
                )}
              </div>

              {/* AI */}
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}>
                {!showAI&&<button onClick={()=>setShowAI(true)} style={{background:'none',border:`1.5px solid ${bdr}`,borderRadius:20,padding:'6px 16px',cursor:'pointer',color:muted,fontFamily:'Epilogue,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:6}}>✨ AI Suggest for "{sel.name.length>18?sel.name.slice(0,18)+'…':sel.name}"</button>}
              </div>
              {showAI&&<AISuggestions listName={sel.name} dark={dark} onClose={()=>setShowAI(false)} onAddTask={(text)=>{
                const task={id:genId(),text,completed:false,completedBy:null,completedAt:null,assignee:null,priority:'MED',dueDate:null,emoji:'📌',reactions:{},comments:[],createdBy:currentUser.id,createdAt:ts()};
                updateList(selId,l=>({...l,tasks:[...l.tasks,task]}));
                pushActivity(currentUser.id,'added',text,sel.name);
              }}/>}

              <div style={{height:48}}/>
            </div>
          )}
        </div>
      </div>
    </>
  );
}