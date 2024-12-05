"use client";

import { useState, useEffect, useRef, SetStateAction } from "react";
import Papa from "papaparse";
import * as d3 from "d3";
import "../../styles/globals.css"; // Ensure this path is correct

type IndividualClaim = {
  Date: string;
  Name: string;
  "Date of death": string;
  "Orient claim": string;
  "Orient note": string;
  "al-Qassam entry": string;
  Verdict: string;
  "Additional notes": string;
};

const TimelinePage: React.FC = () => {
  const [data, setData] = useState<IndividualClaim[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Load CSV data
  useEffect(() => {
    fetch("/cast_lead_lonerbox_data.csv")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((csvText) => {
        Papa.parse<IndividualClaim>(csvText, {
          header: true,
          complete: (result: { data: SetStateAction<IndividualClaim[]>; }) => {
            console.log("Parsed data:", result.data); // Debugging log
            setData(result.data);
          },
        });
      })
      .catch((error) => console.error("Error fetching CSV:", error)); // Debugging log
  }, []);

  // Create the D3 bar chart
  useEffect(() => {
    if (data.length === 0) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    const width = 2000; // Increase width for scrolling
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };

    svg.selectAll("*").remove(); // Clear previous chart

    svg.attr("width", width).attr("height", height);

    const parseDate = d3.timeParse("%d/%m/%Y");
    const claimsByDate = data.map(d => ({
      ...d,
      Date: parseDate(d["Date of death"]),
    })).filter(d => d.Date);

    console.log("Claims by date:", claimsByDate); // Debugging log

    // Group data by date and orient claim
    const deathsByDateAndClaim = d3.rollups(
      claimsByDate,
      (      v: string | any[]) => v.length,
      (      d: { Date: any; }) => d.Date,
      (      d: { [x: string]: any; }) => d["Orient claim"]
    );

    console.log("Deaths by date and claim:", deathsByDateAndClaim); // Debugging log

    const x = d3.scaleTime()
      .domain(d3.extent(claimsByDate, (d: { Date: any; }) => d.Date) as [Date, Date])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(deathsByDateAndClaim, (d: any[]) => d3.max(d[1], (d: any[]) => d[1])) as number])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal(d3.schemeCategory10)
      .domain([...new Set(data.map(d => d["Orient claim"]))]);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b %Y")));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    const barWidth = (width - margin.left - margin.right) / deathsByDateAndClaim.length / 4; // Make columns half as wide
    const groupWidth = barWidth * color.domain().length;

    deathsByDateAndClaim.forEach(([date, claims]: [Date, any[]]) => {
      claims.forEach(([claim, count], i) => {
        svg.append("rect")
          .attr("x", x(date)! + i * barWidth - groupWidth / 2)
          .attr("y", y(count))
          .attr("width", barWidth)
          .attr("height", y(0) - y(count))
          .attr("fill", color(claim))
          .on("mouseover", (event: { pageX: number; pageY: number; }) => {
            tooltip.style("opacity", 1)
              .html(`Date: ${d3.timeFormat("%b %d, %Y")(date)}<br>Claim: ${claim}<br>Deaths: ${count}`)
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY - 28}px`);
          })
          .on("mouseout", () => {
            tooltip.style("opacity", 0);
          });
      });
    });

    // Add legend
    const legend = svg.selectAll(".legend")
      .data(color.domain())
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", (d: any, i: number) => `translate(0,${i * 20})`);

    legend.append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);

    legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .attr("fill", "white") // Set legend labels to white
      .text((d: any) => d);

  }, [data]);

  return (
    <div className="container mx-auto p-6 overflow-x-auto">
      <h1 className="text-4xl font-bold mb-10 text-center text-gray-200">Deaths Timeline</h1>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip" style={{ position: "absolute", textAlign: "center", width: "120px", height: "auto", padding: "8px", font: "12px sans-serif", background: "lightsteelblue", border: "0px", borderRadius: "8px", pointerEvents: "none", opacity: 0 }}></div>
    </div>
  );
};

export default TimelinePage;