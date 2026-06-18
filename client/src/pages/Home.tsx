import { useNavigate } from "react-router-dom"

export default function Home(){
    const navigate = useNavigate()
    navigate("/dashboard")
    return (
        <>
            <h1>Home.</h1>
        </>
    )
}