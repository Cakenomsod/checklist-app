import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./login";

import { saveUserProfile, useLists, createListInDB, updateListInDB, deleteListInDB, sendListInvite, useListInvites, acceptListInvite, declineListInvite, pushActivityToDB, useActivity, updateListOrder } from "./useFirestore";
import FriendPanel, { useFriends, useFriendRequests } from "./FriendSystem";

import ProfileModal from "./ProfileModal";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { createPortal } from 'react-dom';
import MobileApp from './MobileApp';

// ── Mobile detection ──────────────────────────────────────────────────────────
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

const useLongPressSensor = (api) => {
  useEffect(() => {
    const delay = 300; // ms กดค้างกี่ ms ถึงเริ่มลาก
    let timeoutId = null;
    let isDragging = false;

    const onMouseDown = (e) => {
      const draggable = e.target.closest('[data-rfd-drag-handle-draggable-id]');
      if (!draggable) return;
      const id = draggable.getAttribute('data-rfd-drag-handle-draggable-id');

      timeoutId = setTimeout(() => {
        const preDrag = api.tryGetLock(id);
        if (!preDrag) return;
        isDragging = true;
        const drag = preDrag.snapLift();

        const onMouseMove = (ev) => {
          drag.move({ x: ev.clientX, y: ev.clientY });
        };

        const onMouseUp = () => {
          isDragging = false;
          drag.drop();
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      }, delay);
    };

    const onMouseUp = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [api]);
};

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
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  *{box-sizing:border-box;} body{margin:0;}

  :root {
    --fs-xs:   11px;
    --fs-sm:   12.5px;
    --fs-base: 14px;
    --fs-md:   15.5px;
    --fs-lg:   18px;
    --fs-xl:   22px;
    --fs-2xl:  28px;
    --sp-sm:   10px;
    --sp-md:   18px;
    --sp-lg:   28px;
    --sp-xl:   40px;
    --content-max: 760px;
    --content-pad: clamp(24px, 4vw, 64px);
    --sidebar-default: 240px;
  }

  @media (min-width: 1440px) {
    :root {
      --fs-xs:   12px;
      --fs-sm:   13.5px;
      --fs-base: 15px;
      --fs-md:   17px;
      --fs-lg:   20px;
      --fs-xl:   25px;
      --fs-2xl:  32px;
      --sp-sm:   12px;
      --sp-md:   22px;
      --sp-lg:   36px;
      --sp-xl:   52px;
      --content-max: 860px;
      --content-pad: clamp(40px, 5vw, 100px);
      --sidebar-default: 270px;
    }
  }

  @media (min-width: 1920px) {
    :root {
      --fs-xs:   13px;
      --fs-sm:   14.5px;
      --fs-base: 16px;
      --fs-md:   18px;
      --fs-lg:   22px;
      --fs-xl:   28px;
      --fs-2xl:  36px;
      --sp-sm:   14px;
      --sp-md:   26px;
      --sp-lg:   44px;
      --sp-xl:   64px;
      --content-max: 960px;
      --content-pad: clamp(60px, 6vw, 140px);
      --sidebar-default: 300px;
    }
  }

  @keyframes fall {
    0%  {transform:translateY(-20px) rotate(0deg);   opacity:1;}
    100%{transform:translateY(108vh) rotate(540deg); opacity:0;}
  }
  @keyframes fadeUp {from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes shimmer {0%,100%{opacity:1}50%{opacity:.3}}

  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.14);border-radius:4px;}

  input,select,textarea{font-family:'DM Sans',sans-serif;}
  button{transition:opacity .12s,background .15s,border-color .15s,box-shadow .15s;}
  button:active{opacity:.8;}
  input[type=date]::-webkit-calendar-picker-indicator,
  input[type=time]::-webkit-calendar-picker-indicator{opacity:.4;cursor:pointer;}

  /* ── Responsive content wrapper ── */
  .main-content {
    padding: var(--sp-lg) var(--content-pad);
    max-width: calc(var(--content-max) + var(--content-pad) * 2);
    width: 100%;
  }

  /* ── Task card ── */
  .task-card {
    font-size: var(--fs-base);
  }
  .task-card .task-text {
    font-size: var(--fs-base);
  }

  /* ── Sidebar nav items ── */
  .sidebar-item {
    font-size: var(--fs-sm);
    padding: calc(var(--sp-sm) * .7) var(--sp-sm);
  }
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
  return <div title={u.name} style={{width:size,height:size,borderRadius:'50%',background:u.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.42,border:'1.5px solid rgba(0,0,0,.07)',flexShrink:0,userSelect:'none'}}>{u.avatar}</div>;
};

// ── Priority Badge ────────────────────────────────────────────────────────────
const PBadge = ({p}) => (
  <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:'clamp(9.5px,.7vw,11.5px)',fontWeight:600,padding:'2px 8px 2px 6px',borderRadius:20,color:P_COLOR[p],background:P_BG[p],letterSpacing:'.03em',flexShrink:0,fontFamily:"'DM Sans',sans-serif"}}>
    <span style={{width:5,height:5,borderRadius:'50%',background:P_COLOR[p],display:'inline-block',flexShrink:0}}/>
    {p}
  </span>
);

// ── Progress Bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({tasks,dark}) => {
  const total=tasks.length, done=tasks.filter(t=>t.completed).length;
  const pct=total===0?0:Math.round((done/total)*100);
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{flex:1,maxWidth:'clamp(120px,10vw,180px)',height:'clamp(3px,.25vw,5px)',borderRadius:99,background:dark?'#2a2a2a':'rgba(0,0,0,.1)',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,borderRadius:99,background:dark?'rgba(255,255,255,.85)':'#111',transition:'width .4s ease'}}/>
      </div>
      <span style={{color:dark?'rgba(255,255,255,.38)':'rgba(0,0,0,.35)',fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(10.5px,.75vw,13px)',fontWeight:500,flexShrink:0}}>{done}/{total}</span>
    </div>
  );
};

// ── Task Item ─────────────────────────────────────────────────────────────────
const TaskItem = ({task,currentUser,dark,onToggle,onDelete,onReact,onOpenDetail}) => {
  const [hov,setHov]=useState(false);
  const [showRx,setShowRx]=useState(false);
  const surface=dark?'#1e1e1e':'#fff', bdr=dark?'#2c2c2c':'#f0f0f0';
  const txt=dark?'#efefef':'#111', muted=dark?'#555':'#bbb';
  const di=fmtDate(task.dueDate);

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);setShowRx(false);}} style={{
      background:surface,
      border:`1px solid ${hov?(dark?'#3a3a3a':'#e0e0e0'):bdr}`,
      borderRadius:10,
      padding:'clamp(9px,.85vw,13px) clamp(11px,1vw,16px)',
      marginBottom:'clamp(4px,.35vw,7px)',
      boxShadow:hov?`0 1px 12px rgba(0,0,0,${dark?.18:.05})`:'0 1px 3px rgba(0,0,0,.03)',
      display:'flex',gap:'clamp(8px,.75vw,12px)',alignItems:'flex-start',
      opacity:task.completed?.65:1,
      transition:'border-color .12s,box-shadow .12s,opacity .2s',
    }}>
      {/* Checkbox */}
      <button onClick={()=>onToggle(task.id)} style={{
        width:'clamp(16px,1.25vw,21px)',height:'clamp(16px,1.25vw,21px)',
        borderRadius:5,flexShrink:0,marginTop:2,cursor:'pointer',
        border:`1.5px solid ${task.completed?(dark?'#ccc':'#333'):(dark?'#3a3a3a':'#d0d0d0')}`,
        background:task.completed?(dark?'#ccc':'#111'):'transparent',
        display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',padding:0,
      }}>{task.completed&&<span style={{fontSize:'clamp(8px,.6vw,10px)',color:dark?'#111':'#fff',fontWeight:800,lineHeight:1}}>✓</span>}</button>

      <div style={{flex:1,minWidth:0}}>
        {/* Top row: emoji + text + badges */}
        <div style={{display:'flex',alignItems:'center',gap:'clamp(4px,.4vw,7px)',flexWrap:'wrap',marginBottom:task.completed||!task.assignee?0:3}}>
          {task.emoji&&<span style={{fontSize:'clamp(12px,.9vw,15px)',lineHeight:1,flexShrink:0}}>{task.emoji}</span>}
          <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:task.completed?400:500,fontSize:'clamp(13px,.95vw,16px)',color:task.completed?muted:txt,textDecoration:task.completed?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'clamp(160px,18vw,320px)'}}>{task.text}</span>
          <PBadge p={task.priority}/>
          {di&&<span style={{fontSize:'clamp(9.5px,.7vw,11.5px)',padding:'1px 7px',borderRadius:20,flexShrink:0,background:di.urgent?(dark?'#3a1010':'#FFF0F0'):(dark?'#242424':'#f7f7f7'),color:di.urgent?(dark?'#ff8080':'#d44'):(dark?'#666':'#aaa'),fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>{di.label}</span>}
        </div>
        {/* Bottom row: assignee, reactions, comments */}
        <div style={{display:'flex',alignItems:'center',gap:'clamp(5px,.5vw,8px)',flexWrap:'wrap',marginTop:task.emoji||task.text?3:0}}>
          {task.assignee&&!task.completed&&(
            <div style={{display:'flex',alignItems:'center',gap:3}}>
              <Avatar userId={task.assignee} size={Math.round(window.innerWidth >= 1920 ? 17 : 14)}/>
              <span style={{fontSize:'clamp(10px,.72vw,12px)',color:muted,fontFamily:"'DM Sans',sans-serif"}}>{task.assigneeName || task.assignee}</span>
            </div>
          )}
          {task.completed&&task.completedBy&&(
            <div style={{display:'flex',alignItems:'center',gap:3}}>
              <Avatar userId={task.completedBy} size={Math.round(window.innerWidth >= 1920 ? 17 : 14)}/>
              <span style={{fontSize:'clamp(10px,.72vw,12px)',color:'#5a9e6f',fontFamily:"'DM Sans',sans-serif"}}>done by {getUser(task.completedBy).name}</span>
            </div>
          )}
          {REACTIONS_LIST.map(em=>{
            const us=task.reactions[em]||[];
            return us.length>0?(
              <button key={em} onClick={()=>onReact(task.id,em)} style={{background:us.includes(currentUser.id)?(dark?'#2a2a2a':'#f3f3f3'):'transparent',border:`1px solid ${dark?'#2c2c2c':'#ebebeb'}`,borderRadius:99,padding:'1px 7px',fontSize:'clamp(10.5px,.75vw,12.5px)',cursor:'pointer',color:txt,display:'flex',alignItems:'center',gap:2}}>{em}<span style={{fontSize:'clamp(9.5px,.68vw,11.5px)'}}>{us.length}</span></button>
            ):null;
          })}
          {task.comments.length>0&&(
            <button onClick={()=>onOpenDetail(task)} style={{background:'none',border:'none',color:muted,fontSize:'clamp(10px,.72vw,12px)',cursor:'pointer',padding:'1px 4px',display:'flex',alignItems:'center',gap:2,fontFamily:"'DM Sans',sans-serif"}}>💬 {task.comments.length}</button>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div style={{display:'flex',gap:3,opacity:hov?1:0,transition:'opacity .12s',flexShrink:0,alignItems:'center'}}>
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowRx(!showRx)} style={{background:'none',border:`1px solid ${dark?'#2c2c2c':'#ebebeb'}`,borderRadius:6,padding:'clamp(2px,.25vw,4px) clamp(5px,.5vw,8px)',cursor:'pointer',fontSize:'clamp(11px,.8vw,13px)',color:muted,lineHeight:1}}>+😊</button>
          {showRx&&(
            <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:dark?'#1e1e1e':'#fff',border:`1px solid ${dark?'#2c2c2c':'#ebebeb'}`,borderRadius:10,padding:'6px 8px',display:'flex',gap:4,zIndex:200,boxShadow:`0 8px 24px rgba(0,0,0,${dark?.28:.1})`}}>
              {REACTIONS_LIST.map(em=>(
                <button key={em} onClick={()=>{onReact(task.id,em);setShowRx(false);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'clamp(15px,1.2vw,19px)',borderRadius:6,padding:'2px 3px'}}>{em}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={()=>onOpenDetail(task)} style={{background:'none',border:`1px solid ${dark?'#2c2c2c':'#ebebeb'}`,borderRadius:6,padding:'clamp(2px,.25vw,4px) clamp(7px,.7vw,11px)',cursor:'pointer',fontSize:'clamp(11px,.8vw,14px)',color:muted,letterSpacing:2}}>···</button>
        <button onClick={()=>onDelete(task.id)} style={{background:'none',border:`1px solid ${dark?'#2c2c2c':'#ebebeb'}`,borderRadius:6,padding:'clamp(2px,.25vw,4px) clamp(5px,.5vw,8px)',cursor:'pointer',fontSize:'clamp(11px,.8vw,14px)',color:'#d44',lineHeight:1}}>×</button>
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
  const surface = dark?'#1c1c1c':'#fff', txt = dark?'#efefef':'#111';
  const muted = dark?'#555':'#bbb', bdr = dark?'#2c2c2c':'#f0f0f0';

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
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(6px)'}} onClick={onClose}>
      <div style={{background:surface,borderRadius:16,width:480,maxWidth:'95vw',maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column',animation:'fadeUp .18s ease-out',boxShadow:`0 24px 60px rgba(0,0,0,${dark?.5:.15})`}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:'18px 20px 0',borderBottom:`1px solid ${bdr}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
              <div style={{position:'relative',display:'flex',alignItems:'center',flexShrink:0}}>
                <span onClick={() => setShowEmojiPicker(v=>!v)} style={{fontSize:22,cursor:'pointer',userSelect:'none',padding:'3px 5px',borderRadius:8,background:dark?'#2a2a2a':'#f5f5f5',lineHeight:1}}>
                  {editEmoji}
                </span>
                {showEmojiPicker && (
                  <div style={{position:'absolute',top:38,left:0,zIndex:100,background:dark?'#1c1c1c':'#fff',border:`1px solid ${bdr}`,borderRadius:12,padding:10,width:260,boxShadow:'0 8px 32px rgba(0,0,0,.14)'}}>
                    <input autoFocus placeholder="Type emoji..." onChange={e => { const val = e.target.value; if (val) setEditEmoji(val.slice(-2) || val.slice(-1)); }} style={{width:'100%',padding:'7px 10px',borderRadius:8,marginBottom:8,border:`1px solid ${bdr}`,background:dark?'#252525':'#f5f5f5',color:txt,fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif"}}/>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {EMOJIS_LIST.map(em=>(
                        <button key={em} onClick={()=>{setEditEmoji(em);setShowEmojiPicker(false);}} style={{background:editEmoji===em?(dark?'#333':'#efefef'):'transparent',border:'none',borderRadius:6,padding:'4px 6px',fontSize:17,cursor:'pointer'}}>{em}</button>
                      ))}
                    </div>
                    <button onClick={()=>setShowEmojiPicker(false)} style={{width:'100%',marginTop:8,padding:'6px',borderRadius:8,border:`1px solid ${bdr}`,background:'transparent',color:muted,fontFamily:"'DM Sans',sans-serif",fontSize:12,cursor:'pointer'}}>Close</button>
                  </div>
                )}
              </div>
              <input value={editText} onChange={e=>setEditText(e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:17,color:txt,background:'none',border:'none',outline:'none',flex:1,minWidth:0}}/>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:muted,fontSize:20,lineHeight:1,padding:'2px 6px',borderRadius:6,flexShrink:0}}>×</button>
          </div>
          <div style={{display:'flex',gap:0}}>
            {['detail','comments'].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',cursor:'pointer',padding:'8px 16px',fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:tab===t?600:400,color:tab===t?txt:muted,borderBottom:tab===t?`2px solid ${txt}`:'2px solid transparent',letterSpacing:'.01em'}}>
                {t.charAt(0).toUpperCase()+t.slice(1)}{t==='comments'&&task.comments.length>0?` (${task.comments.length})`:''}
              </button>
            ))}
          </div>
        </div>

        <div style={{overflow:'auto',flex:1,padding:'18px 20px'}}>

          {/* Detail Tab */}
          {tab==='detail'&&(
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:muted,display:'block',marginBottom:7,letterSpacing:'.08em',fontFamily:"'DM Sans',sans-serif"}}>PRIORITY</label>
                <div style={{display:'flex',gap:6}}>
                  {PRIORITIES.map(p=>(
                    <button key={p} onClick={()=>setEditPrio(p)} style={{padding:'5px 14px',borderRadius:99,fontSize:11,cursor:'pointer',fontWeight:600,border:`1px solid ${editPrio===p?P_COLOR[p]:(dark?'#2c2c2c':'#e8e8e8')}`,background:editPrio===p?P_BG[p]:'transparent',color:editPrio===p?P_COLOR[p]:muted,fontFamily:"'DM Sans',sans-serif"}}>{p}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{fontSize:10,fontWeight:600,color:muted,display:'block',marginBottom:7,letterSpacing:'.08em',fontFamily:"'DM Sans',sans-serif"}}>ASSIGN TO</label>
                <select value={editAssignee} onChange={e=>setEditAssignee(e.target.value)} style={{width:'100%',background:dark?'#242424':'#f8f8f8',border:`1px solid ${bdr}`,borderRadius:8,padding:'8px 12px',color:txt,fontSize:13,outline:'none'}}>
                  <option value="">Unassigned</option>
                  {memberUsers.map(u=>(
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{fontSize:10,fontWeight:600,color:muted,display:'block',marginBottom:7,letterSpacing:'.08em',fontFamily:"'DM Sans',sans-serif"}}>DUE DATE</label>
                <div style={{display:'flex',gap:8}}>
                  <input type="date" value={editDue} onChange={e=>setEditDue(e.target.value)} style={{flex:1,background:dark?'#242424':'#f8f8f8',border:`1px solid ${bdr}`,borderRadius:8,padding:'8px 12px',color:txt,fontSize:13,outline:'none'}}/>
                  <input type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} style={{width:110,background:dark?'#242424':'#f8f8f8',border:`1px solid ${bdr}`,borderRadius:8,padding:'8px 12px',color:txt,fontSize:13,outline:'none'}}/>
                </div>
              </div>

              <div>
                <label style={{fontSize:10,fontWeight:600,color:muted,display:'block',marginBottom:8,letterSpacing:'.08em',fontFamily:"'DM Sans',sans-serif"}}>REACTIONS</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {REACTIONS_LIST.map(em=>{
                    const us=task.reactions[em]||[];
                    return <button key={em} onClick={()=>onReact(task.id,em)} style={{background:us.includes(currentUser.id)?(dark?'#2a2a2a':'#f0f0f0'):'transparent',border:`1px solid ${dark?'#2c2c2c':'#e8e8e8'}`,borderRadius:99,padding:'5px 12px',cursor:'pointer',fontSize:13,color:txt,display:'flex',gap:4,alignItems:'center'}}>{em}{us.length>0&&<span style={{fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>{us.length}</span>}</button>;
                  })}
                </div>
              </div>

              {task.completed&&task.completedBy&&(
                <div style={{background:dark?'#162218':'#eef8f1',borderRadius:9,padding:'10px 14px',display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'#c8eed3',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>
                    {getUserById(task.completedBy).avatar
                      ? <img src={getUserById(task.completedBy).avatar} style={{width:24,height:24,borderRadius:'50%'}} alt=""/>
                      : '👤'
                    }
                  </div>
                  <span style={{fontSize:12.5,color:'#3a8f56',fontFamily:"'DM Sans',sans-serif"}}>Completed by <strong>{getUserById(task.completedBy).name}</strong></span>
                </div>
              )}
              <button onClick={save} style={{background:'#111',color:'#fafafa',border:'none',borderRadius:9,padding:'11px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,letterSpacing:'.01em'}}>Save Changes</button>
            </div>
          )}

          {/* Comments Tab */}
          {tab==='comments'&&(
            <div>
              {task.comments.length===0&&(
                <p style={{color:muted,fontSize:13,fontFamily:"'DM Sans',sans-serif",padding:'8px 0'}}>No comments yet. Be the first!</p>
              )}
              {task.comments.map(c=>{
                const u = getUserById(c.userId);
                return (
                  <div key={c.id} style={{display:'flex',gap:10,marginBottom:14}}>
                    {u.avatar
                      ? <img src={u.avatar} style={{width:28,height:28,borderRadius:'50%',flexShrink:0,objectFit:'cover'}} alt=""/>
                      : <div style={{width:28,height:28,borderRadius:'50%',background:'#dde8f7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>👤</div>
                    }
                    <div style={{flex:1}}>
                      <div style={{display:'flex',gap:8,alignItems:'baseline',marginBottom:3}}>
                        <span style={{fontSize:12.5,fontWeight:600,color:txt,fontFamily:"'DM Sans',sans-serif"}}>{u.name}</span>
                        <span style={{fontSize:10.5,color:muted}}>{timeAgo(c.createdAt)}</span>
                      </div>
                      <div style={{background:dark?'#242424':'#f5f5f5',borderRadius:'3px 10px 10px 10px',padding:'8px 11px'}}>
                        <p style={{fontSize:13,color:txt,fontFamily:"'DM Sans',sans-serif",margin:0,lineHeight:1.5}}>{c.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{display:'flex',gap:8,marginTop:12}}>
                {currentUser.avatar
                  ? <img src={currentUser.avatar} style={{width:28,height:28,borderRadius:'50%',flexShrink:0,objectFit:'cover'}} alt=""/>
                  : <div style={{width:28,height:28,borderRadius:'50%',background:'#dde8f7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>👤</div>
                }
                <input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addComment()} placeholder="Write a comment..." style={{flex:1,background:dark?'#242424':'#f5f5f5',border:`1px solid ${bdr}`,borderRadius:9,padding:'8px 12px',color:txt,fontSize:13,outline:'none',fontFamily:"'DM Sans',sans-serif"}}/>
                <button onClick={addComment} style={{background:'#111',color:'#fafafa',border:'none',borderRadius:9,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>Send</button>
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

  const txt = dark?'#efefef':'#111', bg = dark?'#1c1c1c':'#fff';
  const bdr = dark?'#2c2c2c':'#eee', muted = dark?'#555':'#bbb';

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

  const inputStyle = {width:'100%',padding:'9px 13px',borderRadius:9,border:`1px solid ${bdr}`,background:dark?'#242424':'#f7f7f7',color:txt,fontFamily:"'DM Sans',sans-serif",fontSize:13.5,outline:'none',boxSizing:'border-box'};
  const labelStyle = {fontSize:10,fontWeight:600,color:muted,letterSpacing:'.08em',marginBottom:6,display:'block',fontFamily:"'DM Sans',sans-serif"};

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16,backdropFilter:'blur(4px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,borderRadius:16,padding:'24px 26px',width:'100%',maxWidth:400,maxHeight:'85vh',overflow:'auto',boxShadow:`0 20px 50px rgba(0,0,0,${dark?.4:.12})`}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
          <h2 style={{fontFamily:"'Lora',serif",fontSize:20,color:txt,margin:0,fontWeight:600}}>Edit List</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:muted,lineHeight:1,padding:'3px 6px',borderRadius:6}}>✕</button>
        </div>

        {/* Name */}
        <div style={{marginBottom:14}}>
          <div style={labelStyle}>LIST NAME</div>
          <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle}/>
        </div>

        {/* Category */}
        <div style={{marginBottom:14}}>
          <div style={labelStyle}>CATEGORY</div>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={inputStyle}>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Color */}
        <div style={{marginBottom:14}}>
          <div style={labelStyle}>COLOR</div>
          <div style={{display:'flex',gap:7}}>
            {PASTEL_COLORS.map(c=>(
              <button key={c} onClick={()=>setColor(c)} style={{width:26,height:26,borderRadius:'50%',background:c,border:color===c?'2.5px solid #111':'2px solid transparent',cursor:'pointer',outline:'none'}}/>
            ))}
          </div>
        </div>

        {/* Private toggle */}
        <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>setIsPrivate(!isPrivate)} style={{
            width:36,height:20,borderRadius:10,border:'none',cursor:'pointer',padding:0,
            background:isPrivate?'#111':'#ddd',position:'relative',transition:'background .2s',flexShrink:0
          }}>
            <div style={{position:'absolute',top:2,left:isPrivate?17:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
          </button>
          <span style={{fontSize:13,color:txt,fontFamily:"'DM Sans',sans-serif"}}>🔒 Private (เฉพาะคุณเห็น)</span>
        </div>

        {/* Members */}
        {!isPrivate && friends.length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={labelStyle}>MEMBERS</div>
            {friends.map(f=>(
              <div key={f.uid} onClick={()=>toggleFriend(f.uid)} style={{
                display:'flex',alignItems:'center',gap:10,padding:'7px 10px',
                borderRadius:9,cursor:'pointer',marginBottom:3,
                background:selectedFriends.includes(f.uid)?(dark?'#242424':'#f2f2f2'):'transparent'
              }}>
                {f.avatar
                  ? <img src={f.avatar} style={{width:28,height:28,borderRadius:'50%',objectFit:'cover'}} alt=""/>
                  : <div style={{width:28,height:28,borderRadius:'50%',background:'#dde8f7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>👤</div>
                }
                <span style={{flex:1,fontSize:13,color:txt,fontFamily:"'DM Sans',sans-serif"}}>{f.name}</span>
                {selectedFriends.includes(f.uid)
                  ? <span style={{color:'#3a8f56',fontWeight:700,fontSize:13}}>✓</span>
                  : <span style={{color:muted,fontSize:12}}>+ Add</span>
                }
              </div>
            ))}
          </div>
        )}

        {/* Save */}
        <button onClick={handleSave} style={{
          width:'100%',padding:'11px',borderRadius:10,background:'#111',
          color:'#fafafa',border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",
          fontSize:14,fontWeight:600,marginTop:4,letterSpacing:'.01em'
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

  const txt=dark?'#efefef':'#111', bg=dark?'#1c1c1c':'#fff';
  const bdr=dark?'#2c2c2c':'#eee', muted=dark?'#555':'#bbb';

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
      selectedFriends,
      createdBy: currentUser.id, createdAt: ts(), tasks: []
    });
    onClose();
  };

  const inputStyle = {width:'100%',padding:'9px 13px',borderRadius:9,border:`1px solid ${bdr}`,background:dark?'#242424':'#f7f7f7',color:txt,fontFamily:"'DM Sans',sans-serif",fontSize:13.5,outline:'none',boxSizing:'border-box'};
  const labelStyle = {fontSize:10,fontWeight:600,color:muted,letterSpacing:'.08em',marginBottom:6,display:'block',fontFamily:"'DM Sans',sans-serif"};

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16,backdropFilter:'blur(4px)'}}>
      <div style={{background:bg,borderRadius:16,padding:'24px 26px',width:'100%',maxWidth:400,maxHeight:'85vh',overflow:'auto',boxShadow:`0 20px 50px rgba(0,0,0,${dark?.4:.12})`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
          <h2 style={{fontFamily:"'Lora',serif",fontSize:20,color:txt,margin:0,fontWeight:600}}>New List</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:muted,lineHeight:1,padding:'3px 6px',borderRadius:6}}>✕</button>
        </div>

        {/* Name */}
        <div style={{marginBottom:14}}>
          <div style={labelStyle}>LIST NAME</div>
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleCreate()}
            placeholder="e.g. Trip to Japan 🗾" style={inputStyle}/>
        </div>

        {/* Category */}
        <div style={{marginBottom:14}}>
          <div style={labelStyle}>CATEGORY</div>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={inputStyle}>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Color */}
        <div style={{marginBottom:14}}>
          <div style={labelStyle}>COLOR</div>
          <div style={{display:'flex',gap:7}}>
            {PASTEL_COLORS.map(c=>(
              <button key={c} onClick={()=>setColor(c)} style={{width:26,height:26,borderRadius:'50%',background:c,border:color===c?'2.5px solid #111':'2px solid transparent',cursor:'pointer',outline:'none'}}/>
            ))}
          </div>
        </div>

        {/* Private toggle */}
        <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>setIsPrivate(!isPrivate)} style={{
            width:36,height:20,borderRadius:10,border:'none',cursor:'pointer',padding:0,
            background:isPrivate?'#111':'#ddd',position:'relative',transition:'background .2s',flexShrink:0
          }}>
            <div style={{position:'absolute',top:2,left:isPrivate?17:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
          </button>
          <span style={{fontSize:13,color:txt,fontFamily:"'DM Sans',sans-serif"}}>🔒 Private (เฉพาะคุณเห็น)</span>
        </div>

        {/* Invite Friends */}
        {!isPrivate && friends.length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={labelStyle}>INVITE FRIENDS</div>
            {friends.map(f=>(
              <div key={f.uid} onClick={()=>toggleFriend(f.uid)} style={{
                display:'flex',alignItems:'center',gap:10,padding:'7px 10px',
                borderRadius:9,cursor:'pointer',marginBottom:3,
                background:selectedFriends.includes(f.uid)?(dark?'#242424':'#f2f2f2'):'transparent'
              }}>
                {f.avatar
                  ? <img src={f.avatar} style={{width:28,height:28,borderRadius:'50%',objectFit:'cover'}} alt=""/>
                  : <div style={{width:28,height:28,borderRadius:'50%',background:'#dde8f7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>👤</div>
                }
                <span style={{flex:1,fontSize:13,color:txt,fontFamily:"'DM Sans',sans-serif"}}>{f.name}</span>
                {selectedFriends.includes(f.uid) && <span style={{color:'#3a8f56',fontWeight:700,fontSize:13}}>✓</span>}
              </div>
            ))}
          </div>
        )}

        <button onClick={handleCreate} style={{
          width:'100%',padding:'11px',borderRadius:10,background:'#111',
          color:'#fafafa',border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",
          fontSize:14,fontWeight:600,marginTop:4,letterSpacing:'.01em'
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
  const surface=dark?'#1e1e1e':'#fff', txt=dark?'#efefef':'#111';
  const bdr=dark?'#2c2c2c':'#ebebeb', muted=dark?'#555':'#bbb';

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
    <div style={{background:dark?'#1e1e1e':'#fafafa',border:`1px solid ${dark?'#2c2c2c':'#ebebeb'}`,borderRadius:12,padding:'14px 16px',marginTop:8,animation:'fadeUp .18s ease-out'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:13}}>✨</span>
          <span style={{fontFamily:"'Lora',serif",fontSize:14,color:txt,fontStyle:'italic'}}>AI Suggestions</span>
          {loading&&<span style={{fontSize:11,color:muted,animation:'shimmer 1.4s ease infinite',fontFamily:"'DM Sans',sans-serif"}}>thinking…</span>}
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:muted,fontSize:16,lineHeight:1,padding:'2px 5px',borderRadius:5}}>×</button>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {loading
          ?Array.from({length:4},(_,i)=><div key={i} style={{height:28,width:70+i*22,borderRadius:99,background:dark?'#2a2a2a':'#ebebeb',animation:`shimmer 1.4s ease ${i*.1}s infinite`}}/>)
          :items.map((s,i)=>(
            <button key={i} onClick={()=>{if(!added.includes(i)){onAddTask(s);setAdded(a=>[...a,i]);}}} style={{padding:'5px 12px',borderRadius:99,fontFamily:"'DM Sans',sans-serif",fontSize:12.5,cursor:'pointer',border:`1px solid ${added.includes(i)?'#111':(dark?'#2c2c2c':'#ddd')}`,background:added.includes(i)?'#111':'transparent',color:added.includes(i)?'#fafafa':txt,transition:'all .15s',fontWeight:added.includes(i)?500:400}}>
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
  const txt=dark?'#efefef':'#111', bg=dark?'#1c1c1c':'#fff';
  const muted=dark?'#555':'#bbb', bdr=dark?'#2c2c2c':'#ececec';

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
    <div className="main-content">
      <h2 style={{fontFamily:"'Lora',serif",fontSize:'clamp(22px,2vw,34px)',color:txt,margin:'0 0 4px'}}>Leaderboard 🏆</h2>
      <p style={{color:muted,fontSize:'clamp(12px,.85vw,15px)',fontFamily:"'DM Sans',sans-serif",marginBottom:'clamp(20px,2vw,36px)',marginTop:6}}>คะแนนจากการทำและสร้าง tasks</p>
      {scores.map((s, i) => (
        <div key={s.id} style={{
          background:bg, border:`1px solid ${bdr}`, borderRadius:12,
          padding:'clamp(11px,1vw,17px) clamp(14px,1.4vw,22px)', marginBottom:8,
          display:'flex', alignItems:'center', gap:'clamp(11px,1vw,17px)',
          boxShadow:i===0?`0 2px 12px rgba(0,0,0,${dark?.1:.04})`:'none',
        }}>
          <div style={{fontSize:'clamp(18px,1.4vw,24px)',width:'clamp(24px,1.8vw,32px)',flexShrink:0}}>{medals[i] || <span style={{fontSize:'clamp(12px,.85vw,15px)',color:muted,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>{i+1}</span>}</div>
          {s.avatar
            ? <img src={s.avatar} style={{width:'clamp(34px,2.5vw,44px)',height:'clamp(34px,2.5vw,44px)',borderRadius:'50%',objectFit:'cover',flexShrink:0}} alt=""/>
            : <div style={{width:'clamp(34px,2.5vw,44px)',height:'clamp(34px,2.5vw,44px)',borderRadius:'50%',background:'#dde8f7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>👤</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:'clamp(13.5px,.95vw,16px)',color:txt,fontFamily:"'DM Sans',sans-serif"}}>{s.name}</div>
            <div style={{fontSize:'clamp(11px,.78vw,13px)',color:muted,fontFamily:"'DM Sans',sans-serif",marginTop:1}}>✅ {s.completed} completed · ➕ {s.added} added</div>
          </div>
          <div style={{fontFamily:"'Lora',serif",fontSize:'clamp(20px,1.6vw,28px)',color:txt,fontWeight:600}}>{s.score}</div>
        </div>
      ))}
      {scores.length === 0 && (
        <div style={{textAlign:'center',padding:'44px 0',color:muted}}>
          <div style={{fontSize:40,marginBottom:10}}>🏆</div>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(13px,.9vw,15px)'}}>เพิ่ม friend และทำ tasks เพื่อดู leaderboard</p>
        </div>
      )}
    </div>
  );
};


// ── Activity Feed ─────────────────────────────────────────────────────────────
const ActivityView = ({activity, dark, currentUser, friends}) => {
  const txt=dark?'#efefef':'#111', muted=dark?'#555':'#bbb', bdr=dark?'#2c2c2c':'#ececec';
  const actionColor=(a)=>a==='completed'?'#2f8a55':a==='added'?'#2a5fb0':'#888';

  const getActivityUser = (userId) => {
    if (userId === currentUser.id) return currentUser;
    const friend = friends.find(f => f.uid === userId);
    if (friend) return { id: friend.uid, name: friend.name, avatar: friend.avatar };
    return { id: userId, name: 'Someone', avatar: null };
  };

  return (
    <div className="main-content" style={{animation:'fadeUp .2s ease-out'}}>
      <h2 style={{fontFamily:"'Lora',serif",fontSize:'clamp(22px,2vw,34px)',color:txt,margin:'0 0 4px'}}>Activity</h2>
      <p style={{color:muted,fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(12px,.85vw,15px)',marginBottom:'clamp(20px,2vw,36px)',marginTop:6}}>Everything happening across your lists</p>
      <div style={{maxWidth:'var(--content-max)'}}>
        {activity.length === 0 && (
          <div style={{textAlign:'center',padding:'44px 0',color:muted}}>
            <div style={{fontSize:40,marginBottom:10}}>⚡</div>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(13px,.9vw,15px)'}}>ยังไม่มี activity ลองสร้าง list หรือเพิ่ม task ดูครับ</p>
          </div>
        )}
        {activity.map((a,i)=>{
          const u = getActivityUser(a.userId);
          return (
            <div key={a.id} style={{display:'flex',gap:'clamp(10px,1vw,16px)',marginBottom:'clamp(13px,1.2vw,20px)',position:'relative'}}>
              {i<activity.length-1&&<div style={{position:'absolute',left:13,top:30,bottom:-8,width:1,background:bdr}}/>}
              {u.avatar
                ? <img src={u.avatar} style={{width:'clamp(26px,2vw,34px)',height:'clamp(26px,2vw,34px)',borderRadius:'50%',flexShrink:0,objectFit:'cover'}} alt=""/>
                : <div style={{width:'clamp(26px,2vw,34px)',height:'clamp(26px,2vw,34px)',borderRadius:'50%',background:'#dde8f7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>👤</div>
              }
              <div style={{paddingTop:3}}>
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(12.5px,.88vw,15px)',color:txt,margin:'0 0 2px',lineHeight:1.5}}>
                  <strong>{u.name}</strong>
                  <span style={{color:actionColor(a.action)}}> {a.action} </span>
                  <span style={{fontStyle:'italic',color:muted}}>"{a.target}"</span>
                </p>
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(10.5px,.72vw,12.5px)',color:muted,margin:0}}>
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

  const [sidebarWidth, setSidebarWidth] = useState(
    window.innerWidth >= 1920 ? 300 : window.innerWidth >= 1440 ? 270 : 240
  );
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
    const sorted = [...firestoreLists].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    setLists(sorted);
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
        justifyContent: 'center', fontFamily: "'DM Sans', sans-serif",
        fontSize: 13, color: '#aaa', letterSpacing: '.02em'
      }}>
        Loading…
      </div>
    );
  }

  // Not logged in
  if (firebaseUser === null) {
    return <Login />;
  }

  // ── Route to mobile layout on small screens ──────────────────────────────
  if (isMobile()) {
    return <MobileApp firebaseUser={firebaseUser} />;
  }

  // Theme vars
  const bg=dark?'#141414':'#f5f5f4', txt=dark?'#efefef':'#111';
  const effectiveSidebarWidth = sidebarCollapsed ? 0 : sidebarWidth;
  const muted=dark?'#555':'#bbb', bdr=dark?'#2c2c2c':'#ececec';
  const surface=dark?'#1c1c1c':'#fff';
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
        <div onClick={() => setShowInvites(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,backdropFilter:'blur(4px)'}}>
          <div onClick={e => e.stopPropagation()} style={{background:surface,borderRadius:16,padding:'24px 26px',width:'100%',maxWidth:420,maxHeight:'80vh',overflow:'auto',boxShadow:`0 20px 50px rgba(0,0,0,${dark?.4:.12})`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontFamily:"'Lora',serif",fontSize:20,color:txt,margin:0,fontWeight:600}}>📬 List Invites</h2>
              <button onClick={() => setShowInvites(false)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:muted,padding:'3px 6px',borderRadius:6}}>✕</button>
            </div>
            {listInvites.length === 0 && (
              <div style={{textAlign:'center',padding:'32px 0',color:muted,fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>ไม่มี invite ตอนนี้ครับ</div>
            )}
            {listInvites.map(inv => (
              <div key={inv.listId} style={{background:inv.listColor||'#D6E8FF',borderRadius:12,padding:'13px 15px',marginBottom:8}}>
                <div style={{fontFamily:"'Lora',serif",fontSize:15,color:'#111',marginBottom:3,fontWeight:600}}>{inv.listName}</div>
                <div style={{fontSize:11.5,color:'rgba(0,0,0,.45)',marginBottom:11,fontFamily:"'DM Sans',sans-serif"}}>invited by {inv.invitedBy}</div>
                <div style={{display:'flex',gap:7}}>
                  <button onClick={async () => { await acceptListInvite(firebaseUser.uid, inv); }} style={{background:'#111',color:'#fafafa',border:'none',borderRadius:8,padding:'7px 15px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontSize:12.5,fontWeight:600}}>✓ Join List</button>
                  <button onClick={async () => { await declineListInvite(firebaseUser.uid, inv.listId); }} style={{background:'rgba(200,50,50,.1)',color:'#c0392b',border:'none',borderRadius:8,padding:'7px 13px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontSize:12.5}}>✕ Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {taskDetail&&<TaskDetailModal task={taskDetail} currentUser={currentUser} dark={dark} onClose={()=>setTaskDetail(null)} onUpdate={updateTask} onSave={(updatedTask)=>{updateTask(updatedTask);setTaskDetail(null);}} onReact={reactToTask} friends={friends} listMembers={sel?.memberIds||[]}/>}

      <div style={{display:'flex',height:'100vh',background:bg,fontFamily:"'DM Sans',sans-serif",overflow:'hidden',position:'relative'}}>

        {/* ── SIDEBAR ──────────────────── */}
        <div style={{
          width: effectiveSidebarWidth,
          minWidth: sidebarCollapsed ? 0 : 160,
          maxWidth: 400,
          background:'#111',
          display:'flex',
          flexDirection:'column',
          flexShrink:0,
          overflow:'hidden',
          position:'relative',
          transition: isResizing.current ? 'none' : 'width .2s ease',
          borderRight:'1px solid rgba(255,255,255,.04)',
        }}>
          {/* Logo */}
          <div style={{padding:'clamp(14px,1.3vw,22px) clamp(14px,1.2vw,20px)',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:'clamp(26px,2vw,34px)',height:'clamp(26px,2vw,34px)',background:'#fff',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'clamp(12px,.9vw,16px)',fontWeight:800,color:'#111',flexShrink:0}}>✓</div>
            <span style={{fontFamily:"'Lora',serif",fontSize:'clamp(15px,1.1vw,19px)',color:'#e8e8e8',letterSpacing:'-.02em',fontStyle:'italic'}}>checkmate</span>
          </div>

          {/* User */}
          <div
            onClick={() => setShowProfile(true)}
            style={{padding:'clamp(9px,.9vw,14px) clamp(14px,1.2vw,20px)',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',gap:9,cursor:'pointer',transition:'background .15s'}}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.05)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          >
            <Avatar userId={currentUser.id} size={Math.round(window.innerWidth >= 1920 ? 34 : 30)}/>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:'clamp(12px,.88vw,15px)',color:'#e8e8e8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentUser.name}</div>
              <div style={{fontSize:'clamp(9px,.65vw,11px)',color:'#3a3a3a',marginTop:1}}>logged in</div>
            </div>
          </div>

          {/* Nav */}
          <div style={{padding:'clamp(6px,.6vw,10px) clamp(6px,.6vw,10px)',overflowY:'auto',overflowX:'hidden',flex:1}}>
            {[{id:'activity',label:'Activity',icon:'⚡'},{id:'leaderboard',label:'Leaderboard',icon:'🏆'}].map(v=>(
              <button key={v.id} onClick={()=>setView(v.id)} style={{width:'100%',textAlign:'left',background:view===v.id?'rgba(255,255,255,.08)':'none',border:'none',borderRadius:7,padding:'clamp(6px,.6vw,9px) clamp(9px,.85vw,13px)',cursor:'pointer',color:view===v.id?'#f0f0f0':'#484848',fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(12px,.88vw,15px)',display:'flex',alignItems:'center',gap:8,marginBottom:1}}>
                <span style={{fontSize:'clamp(11px,.82vw,14px)'}}>{v.icon}</span>{v.label}
              </button>
            ))}

            <div style={{height:1,background:'rgba(255,255,255,.06)',margin:'clamp(8px,.8vw,12px) 4px'}}/>
            <div style={{fontSize:'clamp(8.5px,.65vw,11px)',fontWeight:700,color:'#2e2e2e',letterSpacing:'.12em',padding:'clamp(3px,.3vw,5px) clamp(9px,.85vw,13px) clamp(4px,.4vw,6px)',fontFamily:"'DM Sans',sans-serif"}}>PERSONAL</div>
            <DragDropContext sensors={[useLongPressSensor]} onDragEnd={(result)=>{
              if(!result.destination) return;
              const items=[...personal];
              const [moved]=items.splice(result.source.index,1);
              items.splice(result.destination.index,0,moved);
              // บันทึก order ลง Firestore
              items.forEach((l, i) => updateListOrder(l.id, i));
              setLists(prev=>[...items,...prev.filter(l=>l.isGroup)]);
            }}>
                <Droppable droppableId="personal-lists">
                  {(provided)=>(
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {personal.map((l,index)=>(
                        <Draggable key={l.id} draggableId={l.id} index={index}>
                          {(provided, snapshot)=>(
                            <DraggableItem provided={provided} snapshot={snapshot}>
                              <div {...provided.dragHandleProps} style={{cursor:'grab',color:'#363636',fontSize:11,padding:'0 3px',flexShrink:0}}>⠿</div>
                              <button onClick={()=>{setSelId(l.id);setView('list');setShowAI(false);}} style={{flex:1,textAlign:'left',background:selId===l.id&&view==='list'?'rgba(255,255,255,.08)':'none',border:'none',borderRadius:7,padding:'clamp(5px,.55vw,8px) clamp(8px,.8vw,12px)',cursor:'pointer',color:selId===l.id&&view==='list'?'#f0f0f0':'#4a4a4a',fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(12px,.88vw,15px)',display:'flex',alignItems:'center',gap:7,marginBottom:1}}>
                                <div style={{width:7,height:7,borderRadius:'50%',background:l.color,flexShrink:0}}/>
                                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name}</span>
                                {l.isPrivate&&<span style={{fontSize:9,color:'#2e2e2e'}}>🔒</span>}
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

              <div style={{fontSize:'clamp(8.5px,.65vw,11px)',fontWeight:700,color:'#2e2e2e',letterSpacing:'.12em',padding:'clamp(8px,.8vw,12px) clamp(9px,.85vw,13px) clamp(4px,.4vw,6px)',fontFamily:"'DM Sans',sans-serif"}}>GROUP</div>
              <DragDropContext sensors={[useLongPressSensor]} onDragEnd={(result)=>{
                if(!result.destination) return;
                const items=[...group];
                const [moved]=items.splice(result.source.index,1);
                items.splice(result.destination.index,0,moved);
                // บันทึก order ลง Firestore
                items.forEach((l, i) => updateListOrder(l.id, i + 1000)); // +1000 เพื่อแยก personal กับ group
                setLists(prev=>[...prev.filter(l=>!l.isGroup),...items]);
              }}>
                <Droppable droppableId="group-lists">
                  {(provided)=>(
                    <div {...provided.droppableProps} ref={provided.innerRef} style={{minHeight:8}}>
                      {group.map((l,index)=>(
                        <Draggable key={l.id} draggableId={l.id} index={index}>
                          {(provided, snapshot)=>(
                            <DraggableItem provided={provided} snapshot={snapshot}>
                              <div {...provided.dragHandleProps} style={{cursor:'grab',color:'#363636',fontSize:11,padding:'0 3px',flexShrink:0}}>⠿</div>
                              <button onClick={()=>{setSelId(l.id);setView('list');setShowAI(false);}} style={{flex:1,textAlign:'left',background:selId===l.id&&view==='list'?'rgba(255,255,255,.08)':'none',border:'none',borderRadius:7,padding:'clamp(5px,.55vw,8px) clamp(8px,.8vw,12px)',cursor:'pointer',color:selId===l.id&&view==='list'?'#f0f0f0':'#4a4a4a',fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(12px,.88vw,15px)',display:'flex',alignItems:'center',gap:7,marginBottom:1}}>
                                <div style={{width:7,height:7,borderRadius:'50%',background:l.color,flexShrink:0}}/>
                                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name}</span>
                                <div style={{display:'flex'}}>
                                  {l.members.slice(0,3).map((m,i)=>(
                                    <div key={m} style={{marginLeft:i>0?-4:0,width:14,height:14,borderRadius:'50%',background:getUser(m).color,fontSize:7,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #111'}}>{getUser(m).avatar}</div>
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

            <div style={{height:1,background:'rgba(255,255,255,.06)',margin:'clamp(6px,.6vw,10px) 4px'}}/>

            <button onClick={() => setShowFriends(true)} style={{
              width:'100%', textAlign:'left', background:'none',
              border:'none', borderRadius:7, padding:'clamp(6px,.6vw,9px) clamp(9px,.85vw,13px)',
              cursor:'pointer', color:'#4a4a4a', fontFamily:"'DM Sans',sans-serif",
              fontSize:'clamp(12px,.88vw,15px)', display:'flex', alignItems:'center', gap:7, marginBottom:1
            }}>
              <span style={{fontSize:'clamp(11px,.82vw,14px)'}}>👥</span> Friends {friendRequests.length > 0 && <span style={{background:'#d44',color:'#fff',borderRadius:'50%',width:15,height:15,fontSize:9.5,display:'flex',alignItems:'center',justifyContent:'center',marginLeft:'auto'}}>{friendRequests.length}</span>}
            </button>

            <button onClick={() => setShowInvites(true)} style={{
              width:'100%', textAlign:'left', background:'none',
              border:'none', borderRadius:7, padding:'clamp(6px,.6vw,9px) clamp(9px,.85vw,13px)',
              cursor:'pointer', color:'#4a4a4a', fontFamily:"'DM Sans',sans-serif",
              fontSize:'clamp(12px,.88vw,15px)', display:'flex', alignItems:'center', gap:7, marginBottom:1
            }}>
              <span style={{fontSize:'clamp(11px,.82vw,14px)'}}>📬</span> Invites {listInvites.length > 0 && <span style={{background:'#d44',color:'#fff',borderRadius:'50%',width:15,height:15,fontSize:9.5,display:'flex',alignItems:'center',justifyContent:'center',marginLeft:'auto'}}>{listInvites.length}</span>}
            </button>

            <button onClick={()=>setShowCreate(true)} style={{width:'100%',textAlign:'left',background:'rgba(255,255,255,.04)',border:'1px dashed rgba(255,255,255,.1)',borderRadius:7,padding:'clamp(6px,.6vw,9px) clamp(9px,.85vw,13px)',cursor:'pointer',color:'#4a4a4a',fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(12px,.88vw,15px)',display:'flex',alignItems:'center',gap:7,marginTop:6}}>
              <span style={{color:'#888',fontSize:'clamp(13px,.95vw,17px)'}}>＋</span> New List
            </button>

          </div>

          {/* Bottom */}
            <div style={{padding:'clamp(8px,.8vw,12px) clamp(12px,1.1vw,18px)',borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'clamp(8.5px,.65vw,10.5px)',color:'#383838',fontFamily:"'DM Sans',sans-serif",letterSpacing:'.06em',fontWeight:600}}>CHECKMATE</span>
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>signOut(auth)} style={{background:'rgba(255,255,255,.06)',border:'none',borderRadius:14,padding:'clamp(3px,.35vw,6px) clamp(8px,.75vw,12px)',cursor:'pointer',color:'#888',fontSize:'clamp(10px,.72vw,12.5px)',fontFamily:"'DM Sans',sans-serif"}}>Sign out</button>
                <button onClick={()=>setSidebarCollapsed(!sidebarCollapsed)} style={{background:'rgba(255,255,255,.06)',border:'none',borderRadius:14,padding:'clamp(3px,.35vw,6px) clamp(8px,.75vw,12px)',cursor:'pointer',color:'#888',fontSize:'clamp(11px,.8vw,14px)'}}>{sidebarCollapsed ? '→' : '←'}</button>
                <button onClick={()=>setDark(!dark)} style={{background:'rgba(255,255,255,.06)',border:'none',borderRadius:14,padding:'clamp(3px,.35vw,6px) clamp(8px,.75vw,12px)',cursor:'pointer',color:'#888',fontSize:'clamp(11px,.8vw,14px)'}}>{dark?'☀️':'🌙'}</button>
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
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.1)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            />

            </div>

            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                style={{
                  position:'absolute', left:0, top:'50%', transform:'translateY(-50%)',
                  background:'#111', color:'#888', border:'none',
                  borderRadius:'0 7px 7px 0', padding:'12px 5px',
                  cursor:'pointer', fontSize:12, zIndex:20,
                  writingMode:'vertical-rl'
                }}
              >
                ☰
              </button>
            )}


        {/* ── MAIN ─────────────────────── */}
        <div style={{flex:1,overflow:'auto',display:'flex',flexDirection:'column'}}>
          {view==='leaderboard'&&<LeaderboardView lists={lists} dark={dark} friends={friends} currentUser={currentUser}/>}
          {view==='activity'&&<ActivityView activity={activity} dark={dark} currentUser={currentUser} friends={friends}/>}

          {view==='list'&&!sel&&(
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,color:muted}}>
              <div style={{fontSize:'clamp(40px,4vw,60px)'}}>📋</div>
              <p style={{fontFamily:"'Lora',serif",fontSize:'clamp(17px,1.4vw,24px)',color:txt,fontStyle:'italic',margin:0}}>Pick or create a list</p>
              <button onClick={()=>setShowCreate(true)} style={{background:'#111',color:'#fafafa',border:'none',borderRadius:10,padding:'clamp(9px,0.8vw,13px) clamp(22px,2vw,34px)',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(13px,1vw,16px)',fontWeight:600,marginTop:4}}>Create a List</button>
            </div>
          )}

          {view==='list'&&sel&&(
            <div className="main-content" style={{animation:'fadeUp .15s ease-out'}}>

              {/* Header card */}
              <div style={{background:sel.color,borderRadius:14,padding:'clamp(18px,2vw,28px) clamp(20px,2.5vw,32px)',marginBottom:'clamp(14px,1.5vw,22px)',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',right:-20,top:-20,width:80,height:80,borderRadius:'50%',background:'rgba(0,0,0,.04)',pointerEvents:'none'}}/>
                <div style={{position:'absolute',right:50,bottom:-14,width:40,height:40,background:'rgba(0,0,0,.03)',transform:'rotate(20deg)',pointerEvents:'none'}}/>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'relative',gap:12}}>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                      <h1 style={{fontFamily:"'Lora',serif",fontSize:'clamp(19px,1.6vw,26px)',color:'#111',lineHeight:1.2,margin:0,fontWeight:600}}>{sel.name}</h1>
                      {sel.isPrivate&&<span style={{fontSize:'clamp(9px,.65vw,11px)',background:'rgba(0,0,0,.09)',padding:'2px 8px',borderRadius:99,color:'#333',fontFamily:"'DM Sans',sans-serif",fontWeight:700,letterSpacing:'.04em'}}>🔒 PRIVATE</span>}
                      {sel.isGroup&&<span style={{fontSize:'clamp(9px,.65vw,11px)',background:'rgba(0,0,0,.09)',padding:'2px 8px',borderRadius:99,color:'#333',fontFamily:"'DM Sans',sans-serif",fontWeight:700,letterSpacing:'.04em'}}>👥 GROUP</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:12}}>
                      <span style={{fontSize:'clamp(11px,.8vw,13.5px)',color:'rgba(0,0,0,.38)',fontFamily:"'DM Sans',sans-serif"}}>{sel.category}</span>
                      <span style={{color:'rgba(0,0,0,.18)',fontSize:10}}>·</span>
                      <div style={{display:'flex'}}>
                        {sel.members.map((m,i)=><div key={m} style={{marginLeft:i>0?-5:0}}><Avatar userId={m} size={22}/></div>)}
                      </div>
                    </div>
                    <ProgressBar tasks={sel.tasks} dark={false}/>
                  </div>
                  <div style={{display:'flex',gap:5,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end',alignItems:'flex-start'}}>
                    <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{background:'rgba(0,0,0,.07)',border:'none',borderRadius:7,padding:'clamp(4px,.45vw,7px) clamp(7px,.75vw,11px)',fontSize:'clamp(10.5px,.72vw,13px)',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",color:'#333',outline:'none'}}>
                      <option value="default">Default</option>
                      <option value="priority">Priority</option>
                      <option value="deadline">Deadline</option>
                      <option value="completion">Completion</option>
                    </select>
                    <button onClick={()=>setEditingList(sel)} style={{background:'rgba(0,0,0,.07)',border:'none',borderRadius:7,padding:'clamp(4px,.45vw,7px) clamp(9px,.85vw,13px)',cursor:'pointer',fontSize:'clamp(10.5px,.72vw,13px)',color:'#333',fontFamily:"'DM Sans',sans-serif"}}>Edit</button>
                    <button onClick={()=>deleteList(sel.id)} style={{background:'rgba(200,50,50,.1)',border:'none',borderRadius:7,padding:'clamp(4px,.45vw,7px) clamp(9px,.85vw,13px)',cursor:'pointer',fontSize:'clamp(10.5px,.72vw,13px)',color:'#b83232',fontFamily:"'DM Sans',sans-serif"}}>Delete</button>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              {sortedTasks.length===0&&(
                <div style={{textAlign:'center',padding:'44px 0',color:muted}}>
                  <div style={{fontSize:36,marginBottom:10}}>🌱</div>
                  <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(13px,1vw,15px)'}}>Empty list — add your first task or try AI suggestions!</p>
                </div>
              )}
              <DragDropContext sensors={[useLongPressSensor]} onDragEnd={(result)=>{
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
                        <Draggable key={task.id} draggableId={task.id} index={index} disableInteractiveElementBlocking>
                          {(provided,snapshot)=>(
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.82 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <div {...provided.dragHandleProps} style={{cursor:'grab',color:muted,fontSize:12,flexShrink:0,padding:'4px 2px',display:'flex',alignItems:'center',opacity:.5}}>⠿</div>
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
              <div style={{background:surface,border:`1px solid ${bdr}`,borderRadius:10,padding:'clamp(9px,1vw,13px) clamp(12px,1.2vw,17px)',marginTop:4}}>
                <div style={{display:'flex',gap:9,alignItems:'center'}}>
                  <div style={{width:'clamp(16px,1.2vw,20px)',height:'clamp(16px,1.2vw,20px)',borderRadius:5,border:`1.5px solid ${dark?'#2c2c2c':'#d5d5d5'}`,flexShrink:0}}/>
                  <input value={newText} onChange={e=>setNewText(e.target.value)} onFocus={()=>setExpandAdd(true)} onKeyDown={e=>{if(e.key==='Enter')addTask();if(e.key==='Escape'){setExpandAdd(false);setNewText('');}}} placeholder="Add a task…" style={{flex:1,background:'none',border:'none',outline:'none',fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(13px,1vw,16px)',color:txt}}/>
                  {newText&&<button onClick={addTask} style={{background:'#111',color:'#fafafa',border:'none',borderRadius:7,padding:'clamp(4px,.45vw,7px) clamp(11px,1vw,16px)',cursor:'pointer',fontSize:'clamp(12px,.85vw,14px)',fontFamily:"'DM Sans',sans-serif",fontWeight:600,flexShrink:0}}>Add</button>}
                </div>
                {expandAdd&&(
                  <div style={{display:'flex',gap:7,flexWrap:'wrap',paddingLeft:'clamp(24px,1.8vw,30px)',marginTop:9,animation:'fadeUp .12s ease-out'}}>
                    <div style={{display:'flex',gap:4}}>
                      {PRIORITIES.map(p=>(
                        <button key={p} onClick={()=>setNewPrio(p)} style={{padding:'clamp(3px,.3vw,5px) clamp(9px,.8vw,13px)',borderRadius:99,fontSize:'clamp(10px,.72vw,12px)',cursor:'pointer',fontWeight:600,border:`1px solid ${newPrio===p?P_COLOR[p]:(dark?'#2c2c2c':'#e0e0e0')}`,background:newPrio===p?P_BG[p]:'transparent',color:newPrio===p?P_COLOR[p]:muted,fontFamily:"'DM Sans',sans-serif"}}>{p}</button>
                      ))}
                    </div>
                    <select value={newAssignee} onChange={e=>setNewAssignee(e.target.value)} style={{background:dark?'#242424':'#f5f5f5',border:`1px solid ${bdr}`,borderRadius:7,padding:'clamp(3px,.3vw,5px) clamp(7px,.7vw,10px)',fontSize:'clamp(11px,.78vw,13px)',color:txt,cursor:'pointer',outline:'none'}}>
                      <option value="">Assign to…</option>
                      {[{id:currentUser.id,name:currentUser.name,avatar:currentUser.avatar},
                        ...friends.filter(f=>sel?.memberIds?.includes(f.uid)).map(f=>({id:f.uid,name:f.name,avatar:f.avatar}))
                      ].map(u=>(
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <div style={{display:'flex',gap:4}}>
                      <input type="date" value={newDue} onChange={e=>setNewDue(e.target.value)} style={{background:dark?'#242424':'#f5f5f5',border:`1px solid ${bdr}`,borderRadius:7,padding:'clamp(3px,.3vw,5px) clamp(7px,.7vw,10px)',fontSize:'clamp(11px,.78vw,13px)',color:txt,cursor:'pointer',outline:'none'}}/>
                      <input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} style={{background:dark?'#242424':'#f5f5f5',border:`1px solid ${bdr}`,borderRadius:7,padding:'clamp(3px,.3vw,5px) clamp(7px,.7vw,10px)',fontSize:'clamp(11px,.78vw,13px)',color:txt,cursor:'pointer',outline:'none',width:'clamp(90px,7vw,120px)'}}/>
                    </div>
                  </div>
                )}
              </div>

              {/* AI */}
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:9}}>
                {!showAI&&<button onClick={()=>setShowAI(true)} style={{background:'none',border:`1px solid ${bdr}`,borderRadius:99,padding:'clamp(4px,.45vw,7px) clamp(12px,1.1vw,18px)',cursor:'pointer',color:muted,fontFamily:"'DM Sans',sans-serif",fontSize:'clamp(11.5px,.82vw,13.5px)',display:'flex',alignItems:'center',gap:5}}>✨ Suggest for "{sel.name.length>18?sel.name.slice(0,18)+'…':sel.name}"</button>}
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