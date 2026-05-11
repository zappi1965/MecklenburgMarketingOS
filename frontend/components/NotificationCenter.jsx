export default function NotificationCenter({notifications=[]}){
  return (
    <div className="notificationCenter">
      {notifications.map(n=>(
        <div className={`notification ${n.type}`} key={n.id}>
          <h4>{n.title}</h4>
          <p>{n.body}</p>
        </div>
      ))}
    </div>
  )
}