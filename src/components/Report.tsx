"use client";
import React, { useState, ChangeEvent, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Image from "next/image";
import axios from "axios";
import Loader from "@/components/Loader";
import day from "@/lib/dayjs";

interface DataItem {

  username: string;
  name: string;
  submissionLength: number;
  assignmentLength: number;
  score: number;
  submissionEvaluatedLength: number;
  attendance: string;
  mentorUsername: string;
}

const Report = ({
  hideMentorFilter = false,
}: {
  hideMentorFilter?: boolean;
}) => {
  const [data, setData] = useState<DataItem[]>([]);
  const [sortColumn, setSortColumn] = useState<string>("username");
  const [sortOrder, setSortOrder] = useState<string>("asc");
  const [selectedMentor, setSelectedMentor] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("pdf");
  const [currentCourse, setCurrentCourse] = useState<any>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async (course: any) => {
    if (!course) return;
    try {
      const res = await axios.post("/api/report", { courseId: course.id });
      setData(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/course/get");
      setAllCourses(res.data.courses);
      if (res.data.courses.length > 0) {
        setCurrentCourse(res.data.courses[0]);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleClick = (course: any) => {
    setCurrentCourse(course);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (currentCourse) {
      setLoading(true);
      fetchData(currentCourse);
    }
  }, [currentCourse]);

  const uniqueMentors = Array.from(
    new Set(data.map((item) => item.mentorUsername))
  );

  const columnMapping: { [key: string]: keyof DataItem } = {
    Username: "username",
    Name: "name",
    Submissions: "submissionLength",
    Assignments: "assignmentLength",
    Score: "score",
    Evaluated: "submissionEvaluatedLength",
    Attendance: "attendance",
    Mentor: "mentorUsername",
  };

  const handleSort = (column: string) => {
    const key = columnMapping[column];
    if (!key) return;

    const order = sortColumn === key && sortOrder === "asc" ? "desc" : "asc";
    const sortedData = [...data].sort((a, b) => {
      if (a[key] < b[key]) return order === "asc" ? -1 : 1;
      if (a[key] > b[key]) return order === "asc" ? 1 : -1;
      return 0;
    });
    setSortColumn(key);
    setSortOrder(order);
    setData(sortedData);
  };

  const handleMentorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedMentor(e.target.value);
  };

  const handleFormatChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedFormat(e.target.value);
  };

  const filteredData = selectedMentor
    ? data.filter((item) => item.mentorUsername === selectedMentor)
    : data;

  const downloadCSV = () => {
    const headers = Object.keys(columnMapping);
    const rows = filteredData.map((item) =>
      headers.map((header) => {
        const key = columnMapping[header];
        return item[key] !== undefined ? item[key].toString() : "";
      })
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const formattedDate = day().format("ddd DD MMM, YYYY hh:mm A");
    link.setAttribute("download", `${formattedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    const doc :any= new jsPDF("landscape", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
  
    const formattedDate = day().format("ddd DD MMM, YYYY hh:mm A");
    const title = `Report - ${currentCourse?.title} - ${formattedDate}`;
    const titleWidth = doc.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;
  
    doc.text(title, titleX, 10);
  
    const headers = [
      ["S.No", "Username", "Name", "Assignments", "Submissions", "Evaluated", "Score", "Attendance"],
      ...(!hideMentorFilter ? [["Mentor"]] : []),
    ].flat();
  
    const tableData = filteredData.map((item, index) => [
      index + 1,
      item.username,
      item.name,
      item.assignmentLength,
      item.submissionLength,
      item.submissionEvaluatedLength,
      item.score,
      item.attendance,
      ...(!hideMentorFilter ? [item.mentorUsername] : []),
    ]);
  
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 20,
      margin: { top: 20 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: hideMentorFilter ? { cellWidth: 15 } : { cellWidth: 10 },  // S.No
        1: hideMentorFilter ? { cellWidth: 30 } : { cellWidth: 25 },   // Username
        2: { cellWidth: 80 },   // Name (Widest Column)
        3: { cellWidth: 30 },   // Assignments
        4: { cellWidth: 30 },   // Submissions
        5: { cellWidth: 30 },   // Evaluated
        6: { cellWidth: 20 },   // Score
        7: hideMentorFilter ? { cellWidth: 30 } : { cellWidth: 20 },  // Attendance
        8: hideMentorFilter ? {} : { cellWidth: 25 },  // Mentor (if included)
      },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      theme: "striped",
      pageBreak: "auto",
      didDrawPage: function (data:any) {
        doc.setFontSize(8);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
      },
    });
  
    doc.save(`Report-${formattedDate}.pdf`);
  };
  

  const handleDownload = () => {
    if (selectedFormat === "csv") {
      downloadCSV();
    } else if (selectedFormat === "pdf") {
      downloadPDF();
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="flex gap-3 p-8">
        {allCourses?.map(
          (course: any) =>
            course.isPublished === true && (
              <button
                onClick={() => handleClick(course)}
                className={`rounded p-2 w-20 sm:w-auto ${currentCourse?.id === course?.id
                  ? "border border-blue-500 rounded"
                  : ""
                  }`}
                key={course?.id}
              >
                <h1 className="truncate max-w-xs text-sm font-medium">
                  {course.title}
                </h1>
              </button>
            )
        )}
      </div>
      {data.length === 0 ? (
        <div>
          <div>
            <p className="text-xl font-semibold mt-20 mb-5 flex justify-center items-center">
              No data available to generate report!
            </p>
            <Image
              src="https://i.postimg.cc/N0JMHNDw/undraw-Notify-re-65on-1-removebg-preview.png"
              height={400}
              className="m-auto"
              width={400}
              alt=""
            />
          </div>
        </div>
      ) : (
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg p-6">
          <div className="flex justify-between mb-4">
            {
              hideMentorFilter ? (<div className="flex items-center">
                <span className="mr-2">Mentor:</span>
                <div className="p-2 text-sm text-gray-900 border rounded-lg bg-white">
                  {uniqueMentors.map((mentor) => (
                    <span key={mentor}>
                      {mentor}
                    </span>
                  ))}
                </div>
              </div>) : (
                <div>
                  <select
                    id="mentor-select"
                    title="mentor name"
                    value={selectedMentor}
                    onChange={handleMentorChange}
                    className="p-2 text-sm text-gray-900 border rounded-lg bg-white"
                  >
                    <option value="">All Mentors</option>
                    {uniqueMentors.map((mentor) => (
                      <option key={mentor} value={mentor}>
                        {mentor}
                      </option>
                    ))}
                  </select>
                </div>
              )
            }

            <div>
              <select
                id="format-select"
                title="select format"
                value={selectedFormat}
                onChange={handleFormatChange}
                className="p-2 text-sm text-gray-900 border rounded-l-lg bg-white"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
              <button
                onClick={handleDownload}
                className="p-2 text-sm text-white rounded-r-lg bg-blue-500"
              >
                Download Report
              </button>
            </div>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead className="text-xs bg-blue-500 text-white uppercase rounded-t-lg">
              <tr>
                {[
                  "S.No",
                  "Username",
                  "Name",
                  "Assignments",
                  "Submissions",
                  "Evaluated",
                  "Score",
                  "Attendance",
                ].map((column) => (
                  <th
                    key={column}
                    onClick={() => handleSort(column)}
                    className="px-5 py-3 cursor-pointer border-b border-gray-300 dark:border-gray-500 truncate"
                  >
                    {column}
                    {sortColumn === columnMapping[column] &&
                      (sortOrder === "asc" ? " ↑" : " ↓")}
                  </th>
                ))}
                {hideMentorFilter ? null : (
                  <th
                    onClick={() => handleSort("Mentor")}
                    className="px-5 py-3 cursor-pointer border-b border-gray-300 dark:border-gray-500 truncate"
                  >
                    Mentor
                    {sortColumn === columnMapping["Mentor"] &&
                      (sortOrder === "asc" ? " ↑" : " ↓")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => (
                <tr
                  key={index}
                  className={`bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-100"
                    } dark:bg-gray-800`}
                >
                  <td className="px-5 py-3 border-b border-gray-300 dark:border-gray-700 truncate">
                    {index + 1}
                  </td>
                  <td className="px-5 py-3 border-b border-gray-300 dark:border-gray-700 truncate">
                    {row.username}
                  </td>
                  <td className="px-5 py-3 border-b border-gray-300 dark:border-gray-700 truncate">
                    {row.name}
                  </td>
                  <td className="px-5 py-3 border-b border-gray-300 dark:border-gray-700 truncate">
                    {row.assignmentLength}
                  </td>
                  <td className="px-5 py-3 border-b border-gray-300 dark:border-gray-700 truncate">
                    {row.submissionLength}
                  </td>
                  <td className="px-5 py-3 border-b border-gray-300 dark:border-gray-700 truncate">
                    {row.submissionEvaluatedLength}
                  </td>
                  <td className="px-5 py-3 border-b border-gray-300 dark:border-gray-700 truncate">
                    {row.score}
                  </td>
                  <td className="px-5 py-3 border-b border-gray-300 dark:border-gray-700 truncate">
                    {row.attendance}
                  </td>
                  {hideMentorFilter ? null : (
                    <td className="px-5 py-3 border-b border-gray-300 dark:border-gray-700 truncate">
                      {row.mentorUsername}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Report;
