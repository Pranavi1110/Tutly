import {
  getMentorLeaderboardData,
} from "@/actions/getLeaderboard";
import Leaderboard from "@/components/leaderBoard";

export default async function mentorLeaderboard() {
  const data = await getMentorLeaderboardData();
  <pre>{JSON.stringify(data, null, 2)}</pre>;
  if (data && data.sortedSubmissions && data.createdCourses) {
    const { sortedSubmissions, createdCourses } = data;

    return (
      <Leaderboard
        submissions={sortedSubmissions}
        courses={createdCourses}
        currentUser={data.currentUser}
      />
    );
  } else {
    return null;
  }
}
