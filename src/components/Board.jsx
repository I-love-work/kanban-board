import React, { useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import { getTasks, updateTask } from "../api/taskApi"; // ✅ 修正路径

export default function Board({ columns, setColumns }) {
  // ✅ 组件挂载时从后端加载任务
  useEffect(() => {
    async function fetchTasks() {
      try {
        const data = await getTasks();
        // 按状态分组成列
        const grouped = {
          todo: {
            id: "todo",
            name: "To Do",
            tasks: data.filter((t) => t.status === "todo"),
          },
          inprogress: {
            id: "inprogress",
            name: "In Progress",
            tasks: data.filter((t) => t.status === "inprogress"),
          },
          done: {
            id: "done",
            name: "Done",
            tasks: data.filter((t) => t.status === "done"),
          },
        };
        setColumns(grouped);
      } catch (err) {
        console.error("❌ Failed to load tasks:", err);
      }
    }

    fetchTasks();
  }, [setColumns]);

  // ✅ 拖拽处理逻辑
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return; // 未落到目标位置

    // 同列原地拖拽，不变更
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceCol = columns[source.droppableId];
    const destCol = columns[destination.droppableId];
    const sourceTasks = Array.from(sourceCol.tasks);
    const [moved] = sourceTasks.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      // 同列内重排
      sourceTasks.splice(destination.index, 0, moved);
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceCol, tasks: sourceTasks },
      });
    } else {
      // 跨列移动
      const destTasks = Array.from(destCol.tasks);
      destTasks.splice(destination.index, 0, moved);
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceCol, tasks: sourceTasks },
        [destination.droppableId]: { ...destCol, tasks: destTasks },
      });

      // ✅ 调用后端更新任务状态
      try {
        await updateTask(moved.id, { status: destination.droppableId });
      } catch (err) {
        console.error("❌ Failed to update task:", err);
      }
    }
  };

  // ✅ 渲染每个列
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          alignItems: "flex-start",
          marginTop: 24,
          padding: 8,
        }}
      >
        {Object.entries(columns).map(([id, column]) => (
          <Column key={id} droppableId={id} column={column} />
        ))}
      </div>
    </DragDropContext>
  );
}
