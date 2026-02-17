import { useWelcomeMessage } from "../queries/homeQueries";

export default function Home() {
  const { data, isLoading, isError, error } = useWelcomeMessage();
  if (isLoading) return <h2>Loading...</h2>;

  if (isError) return <h2>Error: {error.message}</h2>;

  return (
    <div className="home">
      <h1>{data.message}</h1>
      <p>API response rendered successfully.</p>
    </div>
  );
}