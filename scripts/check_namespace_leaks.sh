#!/bin/bash

# Script to check for namespace leaks in Docker containers using network_mode: service

echo "Checking for namespace leaks in Docker containers..."

# Get all running containers
containers=$(docker ps --format "{{.ID}}\t{{.Names}}\t{{.Image}}" | grep -v "CONTAINER")

echo "Running containers:"
echo "$containers"
echo ""

# Check for namespace sharing
echo "Checking network namespace sharing:"
for container in $(docker ps -q); do
    container_name=$(docker inspect --format '{{.Name}}' $container | sed 's/\///')
    echo "Container: $container_name"
    
    # Check network namespace
    network_ns=$(docker inspect --format '{{.HostConfig.NetworkMode}}' $container)
    echo "  Network mode: $network_ns"
    
    # If using service mode, check the target container
    if [[ $network_ns == service:* ]]; then
        service_name=${network_ns#service:}
        echo "  Shares network with: $service_name"
        
        # Check if the service container exists and is running
        service_container=$(docker ps -q -f name=$service_name)
        if [ -n "$service_container" ]; then
            echo "  Service container is running: OK"
        else
            echo "  WARNING: Service container $service_name is not running!"
        fi
    fi
    echo ""
done

# Check for process leaks
echo "Checking for process leaks:"
for container in $(docker ps -q); do
    container_name=$(docker inspect --format '{{.Name}}' $container | sed 's/\///')
    echo "Container: $container_name"
    
    # Check number of processes
    process_count=$(docker top $container 2>/dev/null | wc -l)
    if [ $process_count -gt 1 ]; then
        echo "  Process count: $process_count"
        if [ $process_count -gt 50 ]; then
            echo "  WARNING: High process count may indicate leaks!"
            docker top $container 2>/dev/null | head -10
            echo "  ..."
        fi
    else
        echo "  Process count: $process_count (minimal)"
    fi
    echo ""
done

echo "Namespace leak check completed."