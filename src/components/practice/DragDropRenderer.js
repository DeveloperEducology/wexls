'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import styles from './DragDropRenderer.module.css';
import QuestionParts from './QuestionParts';
import { getImageSrc, isImageUrl, isInlineSvg } from './contentUtils';
import SafeImage from './SafeImage';

const POOL_ID = '__pool__';

function DroppableArea({ id, className, children }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? styles.activeDropTarget : ''}`.trim()}
      data-drop-id={id}
    >
      {children}
    </div>
  );
}

function DraggableItem({ item, disabled, selected, onSelect, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: String(item.id),
    disabled,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`${styles.dragItem} ${selected ? styles.selected : ''} ${isDragging ? styles.dragging : ''}`}
      {...listeners}
      {...attributes}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function ItemVisual({ item }) {
  const contentText = String(item.content ?? '');
  const imageSource = getImageSrc(item.imageUrl || contentText);

  const hasVisualContent =
    isInlineSvg(contentText) ||
    isImageUrl(contentText) ||
    isInlineSvg(item.imageUrl) ||
    isImageUrl(item.imageUrl);

  if (isInlineSvg(imageSource)) {
    return <div className={styles.itemImage} dangerouslySetInnerHTML={{ __html: imageSource }} />;
  }

  if (isImageUrl(imageSource)) {
    return (
      <div className={styles.itemImage}>
        <SafeImage
          src={imageSource}
          alt={item.content || 'Drag item'}
          className={styles.image}
          width={120}
          height={120}
          sizes="(max-width: 768px) 26vw, 120px"
        />
      </div>
    );
  }

  return hasVisualContent ? null : <div className={styles.itemLabel}>{contentText}</div>;
}

export default function DragDropRenderer({
  question,
  userAnswer,
  onAnswer,
  onSubmit,
  isAnswered,
}) {
  const placements = userAnswer || {};
  const [selectedItemId, setSelectedItemId] = useState(null);

  const dragItems = useMemo(() => question.dragItems || [], [question.dragItems]);
  const dropGroups = useMemo(() => question.dropGroups || [], [question.dropGroups]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 6 },
    })
  );

  const requiredItemIds = useMemo(
    () =>
      dragItems
        .filter(
          (item) =>
            item.targetGroupId !== null &&
            item.targetGroupId !== undefined &&
            String(item.targetGroupId).trim() !== ''
        )
        .map((item) => String(item.id)),
    [dragItems]
  );

  const placedRequiredCount = requiredItemIds.filter((id) => Boolean(placements[id])).length;
  const canSubmit = requiredItemIds.length === 0 || placedRequiredCount === requiredItemIds.length;

  const getItemsInGroup = (groupId) => dragItems.filter((item) => placements[item.id] === groupId);
  const getUnplacedItems = () => dragItems.filter((item) => !placements[item.id]);

  const updatePlacements = (next) => {
    onAnswer(next);
  };

  const handleDragStart = (event) => {
    if (isAnswered) return;
    setSelectedItemId(String(event.active.id));
  };

  const handleDragEnd = (event) => {
    const itemId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    setSelectedItemId(null);

    if (isAnswered || !overId) return;

    if (overId === POOL_ID) {
      if (placements[itemId]) {
        const next = { ...placements };
        delete next[itemId];
        updatePlacements(next);
      }
      return;
    }

    if (overId.startsWith('group:')) {
      const groupId = overId.replace('group:', '');
      updatePlacements({ ...placements, [itemId]: groupId });
      setSelectedItemId(null);
    }
  };

  const handleDragCancel = () => {
    setSelectedItemId(null);
  };

  const handleGroupTap = (groupId) => {
    if (isAnswered || !selectedItemId) return;
    updatePlacements({ ...placements, [selectedItemId]: String(groupId) });
    setSelectedItemId(null);
  };

  const renderItemCard = (item) => {
    const itemId = String(item.id);
    return (
      <DraggableItem
        key={item.id}
        item={item}
        disabled={isAnswered}
        selected={selectedItemId === itemId}
        onSelect={() => {
          if (isAnswered) return;
          setSelectedItemId((prev) => (prev === itemId ? null : itemId));
        }}
      >
        <ItemVisual item={item} />
      </DraggableItem>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={styles.container}>
        <div className={styles.questionCard}>
          <div className={styles.questionContent}>
            <QuestionParts parts={question.parts} />
          </div>

          {!isAnswered && (
            <p className={styles.instruction}>
              Drag item to a group. You can also tap an item, then tap a group.
            </p>
          )}

          <DroppableArea id={POOL_ID} className={styles.itemsPool}>
            {getUnplacedItems().map((item) => renderItemCard(item))}
          </DroppableArea>

          <div className={styles.dropGroups}>
            {dropGroups.map((group) => (
              <DroppableArea key={group.id} id={`group:${group.id}`} className={styles.dropGroup}>
                <button
                  type="button"
                  className={styles.groupTap}
                  onClick={() => handleGroupTap(group.id)}
                  disabled={isAnswered}
                >
                  <div className={styles.groupLabel}>{group.label}</div>
                  <div className={styles.dropZone}>
                    {getItemsInGroup(group.id).length === 0 ? (
                      <div className={styles.emptyZone}>
                        {selectedItemId ? 'Tap here to place selected item' : 'Drop items here'}
                      </div>
                    ) : (
                      getItemsInGroup(group.id).map((item) => renderItemCard(item))
                    )}
                  </div>
                </button>
              </DroppableArea>
            ))}
          </div>

          {question.showSubmitButton && !isAnswered && (
            <button className={styles.submitButton} disabled={!canSubmit} onClick={() => onSubmit()}>
              Submit Answer
            </button>
          )}
        </div>
      </div>

    </DndContext>
  );
}
